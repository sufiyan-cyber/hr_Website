"""
Dashboard Router — Phase 3 (fixed: no hardcoded fallback numbers)
Role-based dashboard data endpoints.

Endpoints:
  GET /dashboard/admin    — Management Admin metrics
  GET /dashboard/hr       — HR Recruiter metrics
  GET /dashboard/manager  — Senior Manager metrics
  GET /dashboard/employee — Employee personal metrics
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user, role_required

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# ── Role guards ──────────────────────────────────────────────────────────────

ADMIN_ONLY    = role_required("management_admin")
HR_OR_ADMIN   = role_required("hr_recruiter", "management_admin")
MANAGER_ONLY  = role_required("senior_manager")
EMPLOYEE_ONLY = role_required("employee")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


# ===========================================================================
# GET /dashboard/admin
# ===========================================================================

@router.get("/admin", summary="Management Admin dashboard metrics")
async def admin_dashboard(
    _: None = Depends(ADMIN_ONLY),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns aggregate KPIs, chart data, and activity feed for the admin.
    All numbers come from real DB queries — no hardcoded fallbacks.
    Empty DB = zeros and empty arrays.
    """
    supabase = get_supabase()

    # ── Employees ──────────────────────────────────────────────────────────
    try:
        emp_res = (
            supabase.table("users")
            .select("id, role, created_at, employee_profiles(departments(name))")
            .execute()
        )
        employees = [e for e in (emp_res.data or []) if e.get("role") == "employee"]
    except Exception:
        employees = []

    # ── Candidates ─────────────────────────────────────────────────────────
    try:
        cand_res = supabase.table("candidates").select("id, status, created_at").execute()
        candidates = cand_res.data or []
    except Exception:
        candidates = []

    # ── Job descriptions (open positions) ──────────────────────────────────
    try:
        jd_res = supabase.table("job_descriptions").select("id").execute()
        open_positions = len(jd_res.data or [])
    except Exception:
        open_positions = 0

    # ── Hired this month ───────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    hired_this_month = sum(
        1 for c in candidates
        if c.get("status") == "hired"
        and (_dt := _parse_dt(c.get("created_at"))) is not None
        and _dt >= month_start
    )

    # ── Department-wise employee counts (bar chart) ─────────────────────────
    dept_counts: dict[str, int] = {}
    for e in employees:
        profile = e.get("employee_profiles")
        if isinstance(profile, list):
            profile = profile[0] if profile else {}
        elif not isinstance(profile, dict):
            profile = {}
        
        dept_data = profile.get("departments")
        if isinstance(dept_data, dict):
            dept = dept_data.get("name") or "Unknown"
        else:
            dept = "Unknown"
            
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    department_chart = [
        {"department": k, "count": v}
        for k, v in sorted(dept_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # ── Monthly hiring trend — last 6 months (line chart) ──────────────────
    monthly_trend = []
    for i in range(5, -1, -1):
        ref     = now - timedelta(days=i * 30)
        m_start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if m_start.month == 12:
            m_end = m_start.replace(year=m_start.year + 1, month=1)
        else:
            m_end = m_start.replace(month=m_start.month + 1)

        count = sum(
            1 for c in candidates
            if (_dt := _parse_dt(c.get("created_at"))) is not None
            and m_start <= _dt < m_end
        )
        monthly_trend.append({"month": m_start.strftime("%b '%y"), "candidates": count})

    # ── Top skills in demand from job descriptions ─────────────────────────
    try:
        jd_full = supabase.table("job_descriptions").select("description, requirements").execute()
        all_text = " ".join(
            f"{r.get('description', '')} {r.get('requirements', '')}"
            for r in (jd_full.data or [])
        ).lower()
        skill_keywords = ["python", "react", "sql", "aws", "typescript", "java",
                          "node", "django", "fastapi", "kubernetes", "docker"]
        skills_chart = [
            {"skill": s.title(), "count": all_text.count(s)}
            for s in skill_keywords
            if all_text.count(s) > 0
        ]
        skills_chart.sort(key=lambda x: x["count"], reverse=True)
        skills_chart = skills_chart[:5]
    except Exception:
        skills_chart = []

    # ── Activity feed ──────────────────────────────────────────────────────
    recent = sorted(candidates, key=lambda x: x.get("created_at") or "", reverse=True)[:5]
    activity_feed = [
        {
            "event": f"Candidate applied ({c.get('status', 'screening')})",
            "time":  c.get("created_at", ""),
            "type":  "candidate",
        }
        for c in recent
    ]

    return {
        "total_employees":  len(employees),
        "total_applicants": len(candidates),
        "open_positions":   open_positions,
        "hired_this_month": hired_this_month,
        "department_chart": department_chart,
        "monthly_trend":    monthly_trend,
        "skills_chart":     skills_chart,
        "activity_feed":    activity_feed,
    }


# ===========================================================================
# GET /dashboard/hr
# ===========================================================================

@router.get("/hr", summary="HR Recruiter dashboard metrics")
async def hr_dashboard(
    _: None = Depends(HR_OR_ADMIN),
    current_user: dict = Depends(get_current_user),
):
    """Returns recruitment pipeline metrics and recent candidate list. All from real DB."""
    supabase = get_supabase()
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)

    # ── Resumes uploaded this week ─────────────────────────────────────────
    try:
        resume_res = supabase.table("resumes").select("id, created_at").execute()
        resumes = resume_res.data or []
    except Exception:
        resumes = []

    resumes_this_week = sum(
        1 for r in resumes
        if (_dt := _parse_dt(r.get("created_at"))) is not None
        and _dt >= week_start
    )

    # ── Candidates & stages ────────────────────────────────────────────────
    try:
        cand_res = (
            supabase.table("candidates")
            .select("id, status, ai_score, created_at, resumes(candidate_name, email)")
            .order("created_at", desc=True)
            .execute()
        )
        candidates = cand_res.data or []
    except Exception:
        candidates = []

    SCREENED_STAGES = {
        "screening", "shortlisted", "interview_scheduled", "interviewed",
        "offer_extended", "offer_accepted", "offer_rejected", "hired", "rejected",
    }
    SHORTLISTED_STAGES = {
        "shortlisted", "interview_scheduled", "interviewed",
        "offer_extended", "offer_accepted", "hired",
    }

    screened    = sum(1 for c in candidates if c.get("status") in SCREENED_STAGES)
    shortlisted = sum(1 for c in candidates if c.get("status") in SHORTLISTED_STAGES)
    interviews  = sum(1 for c in candidates if c.get("status") in {"interview_scheduled", "interviewed"})

    # ── Recent candidates (last 5) ─────────────────────────────────────────
    recent_candidates = []
    for c in candidates[:5]:
        resume_meta = c.get("resumes") or {}
        recent_candidates.append({
            "id":     c.get("id", ""),
            "name":   resume_meta.get("candidate_name") or "Unknown",
            "email":  resume_meta.get("email") or "",
            "score":  c.get("ai_score") or 0,
            "status": c.get("status") or "screening",
        })

    # ── Pipeline stage counts ──────────────────────────────────────────────
    stage_map = {
        "applied": 0, "screening": 0, "shortlisted": 0,
        "interview_scheduled": 0, "offer_extended": 0, "hired": 0,
    }
    for c in candidates:
        s = c.get("status", "applied")
        if s in stage_map:
            stage_map[s] += 1

    pipeline_stages = [
        {"stage": "Applied",     "count": stage_map["applied"]},
        {"stage": "Screening",   "count": stage_map["screening"]},
        {"stage": "Shortlisted", "count": stage_map["shortlisted"]},
        {"stage": "Interview",   "count": stage_map["interview_scheduled"]},
        {"stage": "Offer",       "count": stage_map["offer_extended"]},
        {"stage": "Hired",       "count": stage_map["hired"]},
    ]

    return {
        "resumes_this_week": resumes_this_week,
        "screened_count":    screened,
        "shortlisted_count": shortlisted,
        "interviews_count":  interviews,
        "recent_candidates": recent_candidates,
        "pipeline_stages":   pipeline_stages,
    }


# ===========================================================================
# GET /dashboard/manager
# ===========================================================================

@router.get("/manager", summary="Senior Manager dashboard metrics")
async def manager_dashboard(
    _: None = Depends(MANAGER_ONLY),
    current_user: dict = Depends(get_current_user),
):
    """Returns team metrics, performance scores, and pending approvals from real DB."""
    supabase = get_supabase()

    # ── Team members ───────────────────────────────────────────────────────
    try:
        emp_res = (
            supabase.table("users")
            .select("id, full_name, role, employee_profiles(departments(name)), performance_reviews!performance_reviews_user_id_fkey(score)")
            .execute()
        )
        raw = [e for e in (emp_res.data or []) if e.get("role") == "employee"]
    except Exception:
        raw = []

    team_members = []
    for m in raw:
        profile = m.get("employee_profiles")
        if isinstance(profile, list):
            profile = profile[0] if profile else {}
        elif not isinstance(profile, dict):
            profile = {}
        
        dept_data = profile.get("departments")
        if isinstance(dept_data, dict):
            dept = dept_data.get("name") or "—"
        else:
            dept = "—"
            
        perf_data = m.get("performance_reviews") or []
        if isinstance(perf_data, dict):
            perf_data = [perf_data]
            
        if perf_data:
            # db score is 0-10, ui expects 0-5
            raw_score = sum(float(p.get("score") or 0) for p in perf_data) / len(perf_data)
            score_5 = round(raw_score / 2, 1)
        else:
            score_5 = 0.0

        team_members.append({
            "id":         m.get("id", ""),
            "name":       m.get("full_name") or m.get("name") or "Team Member",
            "role":       m.get("role") or "Employee",
            "department": dept,
            "score":      score_5,
        })

    avg_score = (
        round(sum(m["score"] for m in team_members) / len(team_members), 1)
        if team_members else 0.0
    )

    # ── Pending approvals (from a real leave_requests table if it exists) ──
    pending_approvals = []
    try:
        leave_res = (
            supabase.table("leave_requests")
            .select("id, type, employee_id, detail, requested_date, users(full_name)")
            .eq("status", "pending")
            .order("requested_date", desc=True)
            .limit(10)
            .execute()
        )
        for row in (leave_res.data or []):
            pending_approvals.append({
                "id":     row.get("id", ""),
                "type":   row.get("type", "Leave Request"),
                "from":   (row.get("users") or {}).get("full_name") or "Employee",
                "detail": row.get("detail") or "—",
                "date":   (row.get("requested_date") or "")[:10],
            })
    except Exception:
        pass  # Table may not exist yet — return empty list

    return {
        "team_size":         len(team_members),
        "pending_approvals": len(pending_approvals),
        "avg_performance":   avg_score,
        "team_members":      team_members,
        "approvals_list":    pending_approvals,
    }


# ===========================================================================
# GET /dashboard/employee
# ===========================================================================

@router.get("/employee", summary="Employee personal dashboard metrics")
async def employee_dashboard(
    _: None = Depends(EMPLOYEE_ONLY),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns personal profile, attendance, payroll, performance, and onboarding tasks.
    All data comes from real DB queries.
    New employees → attendance 0%, no payroll, no performance reviews.
    """
    supabase = get_supabase()
    auth_uid: str = current_user.get("sub", "")
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    profile_data: dict = {}
    employee_id: str | None = None
    try:
        user_row = (
            supabase.table("users")
            .select("id, full_name, email, role, created_at, employee_profiles(departments(name))")
            .eq("auth_user_id", auth_uid)
            .maybe_single()
            .execute()
        )
        profile_data = user_row.data or {}
        employee_id = profile_data.get("id")
    except Exception:
        pass

    profile_obj = profile_data.get("employee_profiles")
    if isinstance(profile_obj, list):
        profile_obj = profile_obj[0] if profile_obj else {}
    elif not isinstance(profile_obj, dict):
        profile_obj = {}
        
    dept_data = profile_obj.get("departments")
    if isinstance(dept_data, dict):
        dept = dept_data.get("name") or "—"
    else:
        dept = "—"

    profile = {
        "name":         profile_data.get("full_name") or current_user.get("email", "Employee").split("@")[0].title(),
        "email":        profile_data.get("email")     or current_user.get("email", ""),
        "role":         profile_data.get("role")      or "Employee",
        "department":   dept,
        "joining_date": (profile_data.get("created_at") or now.isoformat())[:10],
    }

    # ── Attendance this month — REAL query (schema: user_id, status ENUM) ──────────
    attendance = {"present": 0, "absent": 0, "leave": 0, "working_days": 0, "has_records": False}
    if employee_id:
        try:
            att_result = (
                supabase.table("attendance")
                .select("date, status")
                .eq("user_id", employee_id)          # ← correct column
                .gte("date", month_start.date().isoformat())
                .lte("date", now.date().isoformat())
                .execute()
            )
            att_rows = att_result.data or []
            if att_rows:
                present  = sum(1 for r in att_rows if r.get("status") in ("present", "half_day"))
                absent   = sum(1 for r in att_rows if r.get("status") == "absent")
                on_leave = sum(1 for r in att_rows if r.get("status") == "on_leave")  # ENUM value
                total    = len(att_rows)
                attendance = {
                    "present":      present,
                    "absent":       absent,
                    "leave":        on_leave,
                    "working_days": total,
                    "has_records":  True,
                }
        except Exception:
            pass

    # ── Payroll — REAL query (schema: user_id, basic_salary, net_salary, month as DATE) ────
    payroll: dict | None = None
    if employee_id:
        try:
            pay_result = (
                supabase.table("payroll")
                .select("month, status, basic_salary, net_salary")
                .eq("user_id", employee_id)          # ← correct column
                .order("month", desc=True)
                .limit(1)
                .execute()
            )
            rows = pay_result.data or []
            if rows:
                r = rows[0]
                # month is a DATE like '2026-06-01' → label it
                try:
                    from datetime import date as _date
                    d = _date.fromisoformat(r["month"][:10])
                    month_label = d.strftime("%B %Y")
                except Exception:
                    month_label = r.get("month", "—")
                payroll = {
                    "month":       month_label,
                    "status":      r.get("status", "pending").title(),
                    "amount":      f"₹{r.get('net_salary') or 0:,.0f}",  # ← correct column
                    "paid_on":     "—",
                    "has_records": True,
                }
        except Exception:
            pass

    if payroll is None:
        payroll = {"has_records": False, "month": "—", "status": "—", "amount": "—", "paid_on": "—"}

    # ── Performance review — REAL query (schema: user_id, score 0-10, feedback) ────────
    performance: dict | None = None
    if employee_id:
        try:
            perf_result = (
                supabase.table("performance_reviews")
                .select("score, feedback, review_date")
                .eq("user_id", employee_id)          # ← correct column
                .order("review_date", desc=True)
                .limit(1)
                .execute()
            )
            rows = perf_result.data or []
            if rows:
                r = rows[0]
                raw_score = float(r.get("score") or 0)
                score_5   = round(raw_score / 2, 1)  # DB 0-10 → UI 0-5
                # Derive rating label from score
                if raw_score >= 9:   rating = "Exceptional"
                elif raw_score >= 7.5: rating = "Exceeds Expectations"
                elif raw_score >= 6:   rating = "Meets Expectations"
                elif raw_score >= 4:   rating = "Needs Improvement"
                else:                  rating = "Unsatisfactory"
                # Derive quarter
                try:
                    from datetime import date as _date
                    d = _date.fromisoformat(r["review_date"])
                    quarter = f"Q{(d.month - 1) // 3 + 1} {d.year}"
                except Exception:
                    quarter = "—"
                performance = {
                    "score":       score_5,
                    "rating":      rating,
                    "quarter":     quarter,
                    "has_records": True,
                }
        except Exception:
            pass

    if performance is None:
        performance = {"has_records": False, "score": 0, "rating": "—", "quarter": "—"}

    # ── Onboarding tasks — driven by profile completeness ─────────────────
    has_department = bool(profile_data.get("department"))
    onboarding_tasks = [
        {"id": 1, "task": "Complete profile setup",       "done": bool(profile_data.get("full_name"))},
        {"id": 2, "task": "Set your department",          "done": has_department},
        {"id": 3, "task": "Read company handbook",        "done": False},
        {"id": 4, "task": "Attend orientation meeting",   "done": False},
        {"id": 5, "task": "Complete compliance training", "done": False},
    ]

    return {
        "profile":          profile,
        "attendance":       attendance,
        "payroll":          payroll,
        "performance":      performance,
        "onboarding_tasks": onboarding_tasks,
    }
