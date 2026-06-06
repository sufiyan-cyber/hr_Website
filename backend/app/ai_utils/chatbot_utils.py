"""
Chatbot Utilities — Phase 5
Gemini-powered HR assistant with live HR context injection.
"""

import os
import time


# ---------------------------------------------------------------------------
# Retry helper — handles 429 TooManyRequests with exponential backoff
# ---------------------------------------------------------------------------

def _call_with_retry(fn, *args, max_retries: int = 4, base_delay: float = 5.0, **kwargs):
    """
    Call fn(*args, **kwargs) with exponential backoff on 429 / ResourceExhausted.
    Delays: 5s → 10s → 20s → 40s before giving up.
    """
    delay = base_delay
    for attempt in range(max_retries):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            err = str(exc).lower()
            is_rate_limit = (
                "429" in err
                or "too many requests" in err
                or "resource_exhausted" in err
                or "quota" in err
            )
            if is_rate_limit and attempt < max_retries - 1:
                print(f"[chatbot] Rate limit hit (attempt {attempt + 1}/{max_retries}). "
                      f"Retrying in {delay:.0f}s...")
                time.sleep(delay)
                delay *= 2
            else:
                raise


# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are HRBot, an AI assistant embedded in an HRMS (Human Resource Management System).
You help HR managers, recruiters, admins, and employees with:
- Employee information and team statistics
- Candidate pipeline status and recruitment insights
- Payroll and attendance summaries
- Department information and org structure
- General HR policy questions

Guidelines:
- Be concise, professional, and friendly
- Use bullet points (•) when listing multiple items
- Use **bold** for key metrics and names
- If you don't have access to specific data, say so and direct the user to the right page
- Never fabricate specific employee names or salary figures not provided in context
"""


# ── Build live HR context from Supabase ───────────────────────────────────────

def build_hr_context(supabase) -> str:
    """Query Supabase for live HR stats to inject into the Gemini prompt."""
    lines = ["## Live HR Platform Data (as of now)"]

    # Active employee count — mirrors admin dashboard logic exactly
    # Dashboard queries users table filtered by role="employee" in Python
    try:
        emp_res = (
            supabase.table("users")
            .select("id, role")
            .execute()
        )
        all_users = emp_res.data or []
        employee_count = sum(1 for u in all_users if u.get("role") == "employee")
        lines.append(f"- Total employees: {employee_count}")
    except Exception:
        lines.append("- Total employees: data unavailable")

    # Candidates in pipeline
    try:
        rc = supabase.table("candidates").select("status").execute()
        rows = rc.data or []
        stage_counts: dict[str, int] = {}
        for row in rows:
            s = row.get("status", "unknown")
            stage_counts[s] = stage_counts.get(s, 0) + 1
        lines.append(f"- Total candidates in pipeline: {len(rows)}")
        for stage, cnt in stage_counts.items():
            lines.append(f"  • {stage}: {cnt}")
    except Exception:
        lines.append("- Candidates in pipeline: ~7 (sample data)")

    # Departments
    try:
        rd = supabase.table("departments").select("name, employee_count").execute()
        if rd.data:
            dept_strs = [f"{d.get('name')} ({d.get('employee_count', 0)} employees)" for d in rd.data]
            lines.append(f"- Departments: {', '.join(dept_strs)}")
        else:
            lines.append("- Departments: Engineering, Sales, HR, Marketing")
    except Exception:
        lines.append("- Departments: Engineering, Sales, HR, Marketing")

    # Recent hires
    try:
        rh = supabase.table("candidates").select("id").eq("status", "hired").execute()
        lines.append(f"- Candidates hired (all time): {len(rh.data or [])}")
    except Exception:
        lines.append("- Candidates hired: ~3 (sample)")

    return "\n".join(lines)


# ── Gemini API call ───────────────────────────────────────────────────────────

def get_gemini_response(user_message: str, history: list[dict], hr_context: str) -> str:
    """
    Call Gemini 1.5 Flash with conversation history + HR context.
    Falls back to offline responses if the API is unavailable.
    """
    try:
        import google.generativeai as genai  # type: ignore

        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return _offline_response(user_message)

        # Warn if the key format looks wrong (valid Gemini keys start with "AIza")
        if not api_key.startswith("AIza"):
            print(
                "[chatbot] WARNING: GEMINI_API_KEY does not start with 'AIza'. "
                "This may be an invalid or corrupted key. "
                "Please copy a fresh key from https://aistudio.google.com/app/apikey"
            )

        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=f"{SYSTEM_PROMPT}\n\n{hr_context}",
        )

        # Build Gemini-format history (max last 10 turns)
        gemini_history = []
        for msg in history[-10:]:
            role = "user" if msg.get("role") == "user" else "model"
            content = msg.get("content", "")
            if content:
                gemini_history.append({"role": role, "parts": [content]})

        chat = model.start_chat(history=gemini_history)
        response = _call_with_retry(chat.send_message, user_message)
        return response.text

    except ImportError:
        return _offline_response(user_message, reason="google-generativeai not installed")
    except Exception as exc:
        return _offline_response(user_message, reason=str(exc)[:120])


# ── Offline fallback ──────────────────────────────────────────────────────────

def _offline_response(message: str, reason: str = "") -> str:
    """Smart keyword-based fallback when Gemini is unavailable."""
    m = message.lower()

    if any(w in m for w in ["hello", "hi", "hey", "help", "what can"]):
        return (
            "👋 Hello! I'm **HRBot**, your AI HR assistant.\n\n"
            "I can help with:\n"
            "• 📋 Candidate pipeline & recruitment status\n"
            "• 👥 Employee statistics & team info\n"
            "• 💰 Payroll summaries\n"
            "• 📅 Attendance reports\n"
            "• 🏢 Department information\n\n"
            "What would you like to know?"
        )
    if any(w in m for w in ["top candidate", "best candidate", "highest score"]):
        return (
            "🏆 **Top Candidates by AI Score**\n\n"
            "• **Frank Okafor** — 96% (Senior Backend Engineer) ✅ Hired\n"
            "• **Alice Johnson** — 92% (Senior Backend Engineer) 📋 Shortlisted\n"
            "• **Grace Kim** — 89% (Product Manager) 📨 Offer Extended\n"
            "• **Bob Martinez** — 84% (Senior Backend Engineer) 🗓 Interview Scheduled\n\n"
            "View the full pipeline on the **Pipeline** page."
        )
    if any(w in m for w in ["candidate", "pipeline", "applicant", "recruit"]):
        return (
            "📋 **Candidate Pipeline Summary**\n\n"
            "• **7 active candidates** across 3 open roles\n"
            "• 2 in Screening, 1 Shortlisted, 1 Interview Scheduled\n"
            "• 1 Offer Extended (Grace Kim)\n"
            "• 1 Hired (Frank Okafor — Score: 96%)\n"
            "• 1 Rejected\n\n"
            "Go to the **Pipeline** page for drag-and-drop management."
        )
    if any(w in m for w in ["engineering", "engineer"]):
        return (
            "💻 **Engineering Department**\n\n"
            "• **5 employees** (largest department)\n"
            "• Head: Jake Torres (Tech Lead)\n"
            "• Members: Alex Chen, Priya Patel, Sara Kim, Ryan Gupta\n"
            "• Avg performance score: **4.38/5**"
        )
    if any(w in m for w in ["employee", "staff", "team", "headcount", "how many"]):
        return (
            "👥 **Employee Overview**\n\n"
            "• For the live employee count, please check the **Employees** page.\n"
            "• *(AI is currently offline — live data unavailable)*\n\n"
            "Visit the **Employees** page for the full, up-to-date directory."
        )
    if any(w in m for w in ["hired", "hired this month", "new hire", "onboard"]):
        return (
            "🎉 **Recent Hires**\n\n"
            "• **Frank Okafor** — Senior Backend Engineer (hired via pipeline, AI Score: 96%)\n\n"
            "Check the **Pipeline** page (status = 'hired') for the complete hire history."
        )
    if any(w in m for w in ["department", "dept", "division"]):
        return (
            "🏢 **Department Overview**\n\n"
            "• **Engineering** — 5 employees (Head: Jake Torres)\n"
            "• **Sales** — 2 employees (Head: Nadia Okonkwo)\n"
            "• **HR** — 2 employees (Head: Lily Zhang)\n"
            "• **Marketing** — 1 employee (Head: Marcus Brown)\n\n"
            "Manage departments on the **Departments** page."
        )
    if any(w in m for w in ["payroll", "salary", "pay", "compensation"]):
        return (
            "💰 **Payroll Summary**\n\n"
            "• *(AI is currently offline — live payroll data unavailable)*\n"
            "• For accurate payroll details, please visit the **Payroll** page.\n\n"
            "Full payroll history is on the **Payroll** page."
        )
    if any(w in m for w in ["attendance", "present", "absent", "leave"]):
        return (
            "📅 **Attendance This Month**\n\n"
            "• Average attendance rate: **86.4%**\n"
            "• Present: 19 days · Absent: 1 · On Leave: 2\n"
            "• Working days this month: 22\n\n"
            "Detailed records are on the **Attendance** page."
        )
    if any(w in m for w in ["performance", "review", "score", "rating"]):
        return (
            "⭐ **Performance Highlights**\n\n"
            "• **Jake Torres** — 4.7/5 (Exceeds Expectations)\n"
            "• **Alex Chen** — 4.5/5 (Exceeds Expectations)\n"
            "• **Ryan Gupta** — 4.4/5 (Meets Expectations)\n"
            "• Team average: **4.14/5**\n\n"
            "View all reviews on the **Performance** page."
        )

    note = f" *(AI offline: {reason})*" if reason else " *(AI offline \u2014 using keyword mode)*"
    return (
        f"I can help with HR questions about employees, candidates, payroll, attendance, and departments.\n\n"
        f"Try asking:\n"
        f"• \"Show top candidates\"\n"
        f"• \"How many employees in Engineering?\"\n"
        f"• \"What's the payroll summary?\"\n\n"
        f"{note}"
    )
