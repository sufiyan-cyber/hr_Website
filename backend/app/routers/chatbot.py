"""
Chatbot Router — Phase 5
AI HR assistant powered by Gemini with live HR context.

Endpoints:
  POST  /chatbot/message   — Send a message, get AI response
  GET   /chatbot/history   — Last 20 messages for current user
"""

import uuid
from collections import defaultdict
from datetime import datetime, timezone
from time import time as _time

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user, role_required
from app.ai_utils.chatbot_utils import build_hr_context, get_gemini_response

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# ── All authenticated roles can use the chatbot ───────────────────────────────

ALL_ROLES = role_required(
    "hr_recruiter", "management_admin", "senior_manager", "employee"
)

# ── In-memory rate limiter (20 requests / 60 seconds / user) ─────────────────

_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT  = 20
RATE_WINDOW = 60  # seconds


def _enforce_rate_limit(user_id: str) -> None:
    now          = _time()
    window_start = now - RATE_WINDOW
    recent       = [t for t in _rate_store[user_id] if t > window_start]
    if len(recent) >= RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT} messages per minute.",
            headers={"Retry-After": str(RATE_WINDOW)},
        )
    recent.append(now)
    _rate_store[user_id] = recent


# ── Pydantic models ───────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role:    str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


# Removed sample data for production.


# ===========================================================================
# POST /chatbot/message
# ===========================================================================

@router.post("/message", summary="Send a message to the AI HR assistant")
async def send_message(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(ALL_ROLES),
):
    """
    Accepts a user message + conversation history.
    Injects live HR context from Supabase, calls Gemini, returns AI response.
    Saves the exchange to chatbot_history (non-fatal if table missing).
    """
    user_id = current_user.get("sub", "anonymous")

    # Rate limit
    _enforce_rate_limit(user_id)

    # Validate message
    msg = payload.message.strip()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty.",
        )

    supabase  = get_supabase()
    now_iso   = datetime.now(timezone.utc).isoformat()

    # Build live HR context
    hr_context = build_hr_context(supabase)

    # Convert history to plain dicts for the utility function
    history_dicts = [{"role": m.role, "content": m.content} for m in payload.history]

    # Call Gemini (with offline fallback built in)
    ai_response = get_gemini_response(msg, history_dicts, hr_context)

    # Persist both turns to chatbot_history (best-effort)
    try:
        supabase.table("chatbot_history").insert([
            {
                "id":         str(uuid.uuid4()),
                "user_id":    user_id,
                "role":       "user",
                "content":    msg,
                "created_at": now_iso,
            },
            {
                "id":         str(uuid.uuid4()),
                "user_id":    user_id,
                "role":       "assistant",
                "content":    ai_response,
                "created_at": now_iso,
            },
        ]).execute()
    except Exception:
        pass  # Non-fatal — response still returned

    return {
        "response":   ai_response,
        "created_at": now_iso,
    }


# ===========================================================================
# GET /chatbot/history
# ===========================================================================

@router.get("/history", summary="Get last 20 chatbot messages for current user")
async def get_history(
    current_user: dict = Depends(get_current_user),
    _: None = Depends(ALL_ROLES),
):
    """
    Returns up to 20 most recent chatbot messages for the current user,
    ordered chronologically. Falls back to a welcome message if table is empty.
    """
    supabase = get_supabase()
    user_id  = current_user.get("sub", "anonymous")

    try:
        result = (
            supabase.table("chatbot_history")
            .select("id, role, content, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .limit(20)
            .execute()
        )
        messages = result.data or []
    except Exception:
        messages = []

    return {"messages": messages, "total": len(messages)}
