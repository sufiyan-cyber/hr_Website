"""
Candidates Router — Phase 4
Full candidate management: list, detail, stage transitions, notes.

Endpoints:
  GET   /candidates                 — List all candidates (joined with resumes + jobs)
  GET   /candidates/{id}            — Full candidate profile with stage history
  PATCH /candidates/{id}/stage      — Move candidate to a new pipeline stage
  POST  /candidates/{id}/notes      — Add a note to a candidate record
"""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user, role_required

router = APIRouter(prefix="/candidates", tags=["Candidates"])

# ── Role guards ──────────────────────────────────────────────────────────────

HR_OR_ADMIN = role_required("hr_recruiter", "management_admin")
ALL_STAFF    = role_required("hr_recruiter", "management_admin", "senior_manager")

# ── Valid pipeline stages ─────────────────────────────────────────────────────

VALID_STAGES = {
    "applied",
    "screening",
    "shortlisted",
    "interview_scheduled",
    "interviewed",
    "offer_extended",
    "offer_accepted",
    "offer_rejected",
    "hired",
    "rejected",
    "onboarding",
}

# ── Pydantic request models ───────────────────────────────────────────────────

class StageUpdateRequest(BaseModel):
    stage: str
    notes: str | None = None


class NoteRequest(BaseModel):
    note: str


# ── Sample data helpers ───────────────────────────────────────────────────────
# Removed sample data for production.


# ===========================================================================
# GET /candidates
# ===========================================================================

@router.get("", summary="List all candidates with resume and job metadata")
async def list_candidates(
    stage:     str | None = Query(None, description="Filter by pipeline stage"),
    page:      int        = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int        = Query(20, ge=1, le=200, description="Records per page"),
    _: None = Depends(ALL_STAFF),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns a list of candidates joined with resume and job description data.
    Gracefully falls back to sample data when the table is empty.
    """
    supabase = get_supabase()

    try:
        offset = (page - 1) * page_size
        query = (
            supabase.table("candidates")
            .select(
                "id, status, ai_score, job_id, created_at, "
                "resumes(candidate_name, email), "
                "job_descriptions(title)"
            )
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
        )
        if stage:
            query = query.eq("status", stage)

        result = query.execute()
        rows = result.data or []
    except Exception:
        rows = []

    candidates = []
    for row in rows:
        resume_meta = row.get("resumes") or {}
        jd_meta     = row.get("job_descriptions") or {}
        candidates.append({
            "id":             row.get("id", ""),
            "candidate_name": resume_meta.get("candidate_name") or "Unknown",
            "email":          resume_meta.get("email") or "",
            "status":         row.get("status") or "applied",
            "ai_score":       float(row.get("ai_score") or 0),
            "job_id":         row.get("job_id") or "",
            "job_title":      jd_meta.get("title") or "—",
            "created_at":     row.get("created_at") or "",
        })

    # No fallback logic; if empty, returns 0 candidates.

    return {
        "total":      len(candidates),
        "page":       page,
        "page_size":  page_size,
        "candidates": candidates,
    }


# ===========================================================================
# GET /candidates/{id}
# ===========================================================================

@router.get("/{candidate_id}", summary="Full candidate profile with stage history")
async def get_candidate(
    candidate_id: str,
    _: None = Depends(ALL_STAFF),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns full candidate profile including resume details, job info,
    AI summary (parsed from JSON), and complete stage history.
    Falls back to sample data if the candidate is not found.
    """
    supabase = get_supabase()

    # ── Fetch candidate + joined tables ───────────────────────────────────
    try:
        result = (
            supabase.table("candidates")
            .select(
                "*, "
                "resumes(id, candidate_name, email, file_url, created_at), "
                "job_descriptions(id, title, description)"
            )
            .eq("id", candidate_id)
            .maybe_single()
            .execute()
        )
        row = result.data
    except Exception:
        row = None

    # ── Fetch stage history ────────────────────────────────────────────────
    stage_history = []
    if row:
        try:
            hist_result = (
                supabase.table("candidate_status")
                .select("stage, notes, updated_at, updated_by")
                .eq("candidate_id", candidate_id)
                .order("updated_at", desc=False)
                .execute()
            )
            stage_history = hist_result.data or []
        except Exception:
            stage_history = []

    # ── Handle missing candidate ────────────────────────────────────────────
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # ── Parse ai_summary JSON ──────────────────────────────────────────────
    ai_summary_raw    = row.get("ai_summary")
    ai_summary_parsed = {}
    if ai_summary_raw:
        try:
            if ai_summary_raw.strip().startswith("{"):
                ai_summary_parsed = json.loads(ai_summary_raw)
        except Exception:
            ai_summary_parsed = {}

    resume_meta = row.get("resumes") or {}
    jd_meta     = row.get("job_descriptions") or {}



    return {
        "id":                row.get("id", ""),
        "candidate_name":    resume_meta.get("candidate_name") or "Unknown",
        "email":             resume_meta.get("email") or "",
        "status":            row.get("status") or "applied",
        "ai_score":          float(row.get("ai_score") or 0),
        "job_id":            row.get("job_id") or "",
        "job_title":         jd_meta.get("title") or "—",
        "file_url":          resume_meta.get("file_url"),
        "resume_created_at": resume_meta.get("created_at"),
        "created_at":        row.get("created_at") or "",
        "ai_summary":        ai_summary_raw,
        "ai_summary_parsed": ai_summary_parsed,
        "stage_history":     stage_history,
    }


# ===========================================================================
# PATCH /candidates/{id}/stage
# ===========================================================================

@router.patch("/{candidate_id}/stage", summary="Move candidate to a new pipeline stage")
async def update_stage(
    candidate_id: str,
    payload: StageUpdateRequest,
    _: None = Depends(HR_OR_ADMIN),
    current_user: dict = Depends(get_current_user),
):
    """
    Updates the candidate's status field and inserts a row into
    candidate_status history table with optional notes.
    """
    if payload.stage not in VALID_STAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid stage '{payload.stage}'. Valid stages: {sorted(VALID_STAGES)}",
        )

    supabase = get_supabase()
    auth_uid: str = current_user.get("sub", "")

    # ── Resolve internal user ID ───────────────────────────────────────────
    user_id: str | None = None
    try:
        user_row = (
            supabase.table("users")
            .select("id")
            .eq("auth_user_id", auth_uid)
            .maybe_single()
            .execute()
        )
        user_id = user_row.data["id"] if user_row.data else None
    except Exception:
        pass

    now_iso = datetime.now(timezone.utc).isoformat()

    # ── Update candidate status ────────────────────────────────────────────
    try:
        supabase.table("candidates").update({"status": payload.stage}).eq("id", candidate_id).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update candidate stage: {exc}",
        )

    # ── Insert stage history row ───────────────────────────────────────────
    try:
        supabase.table("candidate_status").insert({
            "id":           str(uuid.uuid4()),
            "candidate_id": candidate_id,
            "stage":        payload.stage,
            "notes":        payload.notes,
            "updated_by":   user_id,
            "updated_at":   now_iso,
        }).execute()
    except Exception:
        pass  # History insertion failure is non-fatal

    return {
        "message":      f"Candidate moved to '{payload.stage}' successfully.",
        "candidate_id": candidate_id,
        "stage":        payload.stage,
        "updated_at":   now_iso,
    }


# ===========================================================================
# POST /candidates/{id}/notes
# ===========================================================================

@router.post("/{candidate_id}/notes", status_code=status.HTTP_201_CREATED, summary="Add a note to a candidate")
async def add_note(
    candidate_id: str,
    payload: NoteRequest,
    _: None = Depends(HR_OR_ADMIN),
    current_user: dict = Depends(get_current_user),
):
    """
    Adds a note to the candidate's status history, preserving the current stage.
    Fetches current stage first; defaults to 'screening' if unavailable.
    """
    supabase = get_supabase()
    auth_uid: str = current_user.get("sub", "")

    # ── Resolve internal user ID ───────────────────────────────────────────
    user_id: str | None = None
    try:
        user_row = (
            supabase.table("users")
            .select("id")
            .eq("auth_user_id", auth_uid)
            .maybe_single()
            .execute()
        )
        user_id = user_row.data["id"] if user_row.data else None
    except Exception:
        pass

    # ── Get current stage ─────────────────────────────────────────────────
    current_stage = "screening"
    try:
        cand_row = (
            supabase.table("candidates")
            .select("status")
            .eq("id", candidate_id)
            .maybe_single()
            .execute()
        )
        if cand_row.data:
            current_stage = cand_row.data.get("status") or "screening"
    except Exception:
        pass

    now_iso = datetime.now(timezone.utc).isoformat()

    # ── Insert note as status history row ─────────────────────────────────
    note_id = str(uuid.uuid4())
    try:
        supabase.table("candidate_status").insert({
            "id":           note_id,
            "candidate_id": candidate_id,
            "stage":        current_stage,
            "notes":        payload.note,
            "updated_by":   user_id,
            "updated_at":   now_iso,
        }).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save note: {exc}",
        )

    return {
        "message":      "Note added successfully.",
        "note_id":      note_id,
        "candidate_id": candidate_id,
        "stage":        current_stage,
        "created_at":   now_iso,
    }
