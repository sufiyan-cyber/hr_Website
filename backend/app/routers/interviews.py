"""
Interviews Router
HR-Recruiter-only endpoint to generate a Google Meet link via the
Google Calendar API (service-account flow).

Endpoint:
  POST /interviews/generate-meet-link
    Body: { candidate_name, candidate_email (optional), interviewer_email (optional) }
    Returns: { meet_link, event_id, event_link }

Setup (see README / env section):
  1. Create a Google Cloud project → enable Google Calendar API.
  2. Create a Service Account → download the JSON key.
  3. Share at least one Google Calendar with the service account
     (grant "Make changes to events" permission).
  4. Set GOOGLE_SERVICE_ACCOUNT_JSON (the raw JSON string, base64-encoded
     or as a path) and GOOGLE_CALENDAR_ID in your .env file.
"""

import json
import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.middleware.dependencies import get_current_user, role_required

router = APIRouter(prefix="/interviews", tags=["Interviews"])

# ── Role guard: HR Recruiter only ────────────────────────────────────────────

HR_ONLY = role_required("hr_recruiter")


# ── Pydantic models ───────────────────────────────────────────────────────────

class GenerateMeetRequest(BaseModel):
    candidate_name:    str
    candidate_email:   str | None = None
    interviewer_email: str | None = None


# ── Helper: build Google Calendar service ────────────────────────────────────

def _load_sa_info() -> dict:
    """
    Loads the service-account JSON dict from env vars.
    Handles:
      - Base64-encoded JSON  (GOOGLE_SERVICE_ACCOUNT_JSON=<base64>)
      - Raw JSON string      (GOOGLE_SERVICE_ACCOUNT_JSON={...})
      - Path to .json file   (GOOGLE_SERVICE_ACCOUNT_FILE=/path/to/key.json)
    Raises RuntimeError with a diagnostic message on any failure.
    """
    import base64
    import tempfile

    # ── Read + strip both env vars (handles Windows \r\n endings) ────────────
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    file_path = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "").strip()

    if raw:
        # ── Attempt 1: treat as base64 ────────────────────────────────────
        try:
            # Add padding so base64 always decodes regardless of trailing = chars
            padded = raw + "=" * (-len(raw) % 4)
            decoded = base64.b64decode(padded).decode("utf-8").strip()
            return json.loads(decoded)
        except Exception:
            pass  # not base64 — fall through to raw JSON attempt

        # ── Attempt 2: treat as raw JSON ──────────────────────────────────
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            # Give a helpful diagnostic — show what we actually received
            preview = raw[:60].replace("\r", "\\r").replace("\n", "\\n")
            raise RuntimeError(
                f"GOOGLE_SERVICE_ACCOUNT_JSON could not be parsed as base64 or JSON. "
                f"First 60 chars received: {preview!r}  |  JSON error: {exc}"
            )

    if file_path:
        if not os.path.exists(file_path):
            raise RuntimeError(
                f"GOOGLE_SERVICE_ACCOUNT_FILE path does not exist: {file_path}"
            )
        with open(file_path, "r", encoding="utf-8") as fh:
            return json.load(fh)

    raise RuntimeError(
        "Google service account credentials not configured. "
        "Set GOOGLE_SERVICE_ACCOUNT_JSON (base64 or raw JSON) "
        "or GOOGLE_SERVICE_ACCOUNT_FILE (path to JSON key) in .env"
    )


def _get_calendar_service():
    """
    Builds a Google Calendar API service client using the service account
    credentials stored in GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE.
    Raises RuntimeError if credentials are not configured or are invalid.
    """
    try:
        from google.oauth2 import service_account          # type: ignore
        from googleapiclient.discovery import build        # type: ignore
    except ImportError:
        raise RuntimeError(
            "Google API libraries not installed. "
            "Run: pip install google-api-python-client google-auth"
        )

    SCOPES = ["https://www.googleapis.com/auth/calendar"]

    sa_info = _load_sa_info()   # raises RuntimeError with clear message on failure

    credentials = service_account.Credentials.from_service_account_info(
        sa_info, scopes=SCOPES
    )
    return build("calendar", "v3", credentials=credentials)


# ===========================================================================
# POST /interviews/generate-meet-link
# ===========================================================================

@router.post(
    "/generate-meet-link",
    summary="Generate a Google Meet link for a candidate interview (HR Recruiter only)",
)
async def generate_meet_link(
    payload: GenerateMeetRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(HR_ONLY),
):
    """
    Creates a Google Calendar event with Google Meet conferencing for the
    specified candidate and returns the Meet link.

    The event is created 1 hour from now and lasts 1 hour by default.
    """
    calendar_id = os.getenv("GOOGLE_CALENDAR_ID", "primary")

    # ── Build event start / end ───────────────────────────────────────────────
    now       = datetime.now(timezone.utc)
    start_dt  = now + timedelta(hours=1)
    end_dt    = start_dt + timedelta(hours=1)

    start_iso = start_dt.isoformat()
    end_iso   = end_dt.isoformat()

    # ── Build attendees list ──────────────────────────────────────────────────
    attendees = []
    if payload.candidate_email:
        attendees.append({"email": payload.candidate_email})
    if payload.interviewer_email:
        attendees.append({"email": payload.interviewer_email})

    # ── Calendar event body ───────────────────────────────────────────────────
    event_body = {
        "summary": f"Interview — {payload.candidate_name}",
        "description": (
            f"Interview scheduled via HRMS for candidate: {payload.candidate_name}\n"
            f"Scheduled by: {current_user.get('email', 'HR Team')}"
        ),
        "start": {"dateTime": start_iso, "timeZone": "UTC"},
        "end":   {"dateTime": end_iso,   "timeZone": "UTC"},
        "attendees": attendees,
        "conferenceData": {
            "createRequest": {
                "requestId": str(uuid.uuid4()),
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email",  "minutes": 60},
                {"method": "popup",  "minutes": 15},
            ],
        },
    }

    # ── Call Google Calendar API (with Jitsi fallback) ───────────────────────
    service = _get_calendar_service()
    meet_link = None
    created = None
    
    try:
        # First attempt: Try to generate a native Google Meet link
        created = (
            service.events()
            .insert(
                calendarId=calendar_id,
                body=event_body,
                conferenceDataVersion=1,
                sendUpdates="all",
            )
            .execute()
        )
        
        # Extract Meet link
        conference_data = created.get("conferenceData", {})
        entry_points    = conference_data.get("entryPoints", [])
        meet_link = next(
            (ep["uri"] for ep in entry_points if ep.get("entryPointType") == "video"),
            None,
        ) or created.get("hangoutLink")

    except Exception as exc:
        err_msg = str(exc)
        # Check if the error is the known Service Account Hangouts Meet restriction
        if "Service accounts cannot" in err_msg or "conference" in err_msg.lower() or "403" in err_msg:
            # FALLBACK: Create a free Jitsi link and put it in the event location
            import re
            
            # Create a clean, URL-safe meeting ID
            safe_name = re.sub(r'[^a-zA-Z0-9]', '', payload.candidate_name)
            jitsi_link = f"https://meet.jit.si/HRMS-Interview-{safe_name}-{str(uuid.uuid4())[:8]}"
            
            # Remove the restricted Google Meet request and attendees
            event_body.pop("conferenceData", None)
            event_body.pop("attendees", None)
            
            # Add the Jitsi link to the event
            event_body["location"] = jitsi_link
            event_body["description"] = f"Join Video Interview Here: {jitsi_link}\n\n" + event_body["description"]
            
            try:
                # Second attempt: Insert event without native Meet generation and without attendees
                created = (
                    service.events()
                    .insert(
                        calendarId=calendar_id,
                        body=event_body,
                        # Removed sendUpdates="all" because we removed attendees
                    )
                    .execute()
                )
                meet_link = jitsi_link
            except Exception as fallback_exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Google Calendar API fallback error: {str(fallback_exc)[:200]}",
                )
        else:
            # It's a different error, raise it
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Google Calendar API error: {err_msg[:200]}",
            )

    if not meet_link:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate a meeting link for the calendar event.",
        )

    return {
        "meet_link":  meet_link,
        "event_id":   created.get("id", ""),
        "event_link": created.get("htmlLink", ""),
        "start":      start_iso,
        "end":        end_iso,
        "candidate":  payload.candidate_name,
    }
