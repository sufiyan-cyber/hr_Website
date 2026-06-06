"""
Recruitment Router — Phase 2
AI Resume Screening System

Endpoints:
  POST /recruitment/upload-resumes   — Upload multiple PDF/DOCX resumes to S3
  POST /recruitment/upload-jd        — Upload or save a job description
  POST /recruitment/screen           — Run AI screening: extract → parse → match → rank
  GET  /recruitment/results/{job_id} — Retrieve ranked candidates for a job
"""

import uuid
import time
from collections import defaultdict
from datetime import datetime, timezone
from time import time as _time

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel as PM

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user, role_required
from app.schemas.recruitment import (
    CandidateScoreOut,
    ResultsResponse,
    ScreenRequest,
    ScreenResponse,
    UploadJDResponse,
    UploadResumesResponse,
)

router = APIRouter(prefix="/recruitment", tags=["Recruitment"])

# ── In-memory rate limiter (10 requests / 60 seconds / user) ─────────────────
_screen_rate_store: dict[str, list[float]] = defaultdict(list)
SCREEN_RATE_LIMIT  = 10
SCREEN_RATE_WINDOW = 60  # seconds


def _enforce_screen_rate_limit(user_id: str) -> None:
    now          = _time()
    window_start = now - SCREEN_RATE_WINDOW
    recent       = [t for t in _screen_rate_store[user_id] if t > window_start]
    if len(recent) >= SCREEN_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {SCREEN_RATE_LIMIT} screening requests per minute.",
            headers={"Retry-After": str(SCREEN_RATE_WINDOW)},
        )
    recent.append(now)
    _screen_rate_store[user_id] = recent


# ── Role guards ──────────────────────────────────────────────────────────────

HR_OR_ADMIN = role_required("hr_recruiter", "management_admin")

# ── Allowed file types ───────────────────────────────────────────────────────

ALLOWED_MIME = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB per file


# ===========================================================================
# POST /recruitment/upload-resumes
# ===========================================================================

@router.post(
    "/upload-resumes",
    response_model=UploadResumesResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload multiple resume files (PDF/DOCX) to S3",
    dependencies=[Depends(HR_OR_ADMIN)],
)
async def upload_resumes(
    files: list[UploadFile] = File(..., description="PDF or DOCX resume files"),
    current_user: dict = Depends(get_current_user),
):
    """
    Accepts 1–20 PDF/DOCX files. For each file:
    1. Validates type and size
    2. Uploads to AWS S3
    3. Quick-extracts candidate name/email for metadata
    4. Saves a row in public.resumes table
    Returns lists of successes and failures.
    """
    from app.ai_utils.s3_uploader import upload_file

    if len(files) > 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Maximum 20 files per upload.",
        )

    supabase = get_supabase()
    auth_uid: str = current_user.get("sub", "")

    # Resolve the internal user UUID from auth UID
    user_row = (
        supabase.table("users")
        .select("id")
        .eq("auth_user_id", auth_uid)
        .maybe_single()
        .execute()
    )
    uploader_id: str | None = user_row.data["id"] if user_row.data else None

    uploaded = []
    failed = []

    for file in files:
        try:
            # ── Validate ──
            if file.content_type not in ALLOWED_MIME:
                failed.append({"filename": file.filename, "reason": "Unsupported file type. Only PDF and DOCX allowed."})
                continue

            file_bytes = await file.read()

            if len(file_bytes) > MAX_FILE_SIZE:
                failed.append({"filename": file.filename, "reason": "File exceeds 10 MB limit."})
                continue

            if len(file_bytes) == 0:
                failed.append({"filename": file.filename, "reason": "File is empty."})
                continue

            # ── Upload to S3 ──
            print(f"[{datetime.now(timezone.utc).isoformat()}] START upload")
            file_url = upload_file(
                file_bytes=file_bytes,
                original_filename=file.filename,
                content_type=file.content_type,
                category="resumes",
            )

            # ── Name extraction ──
            candidate_name = file.filename.rsplit(".", 1)[0]
            candidate_email = None

            # ── Save to DB ──
            print(f"[{datetime.now(timezone.utc).isoformat()}] START database write")
            row = {
                "id": str(uuid.uuid4()),
                "candidate_name": candidate_name,
                "email": candidate_email,
                "file_url": file_url,
                "uploaded_by": uploader_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            supabase.table("resumes").insert(row).execute()
            print(f"[{datetime.now(timezone.utc).isoformat()}] END database write")

            uploaded.append({
                "id": row["id"],
                "candidate_name": candidate_name,
                "email": candidate_email,
                "file_url": file_url,
                "created_at": row["created_at"],
            })

        except Exception as exc:
            failed.append({"filename": file.filename or "unknown", "reason": str(exc)})

    return UploadResumesResponse(uploaded=uploaded, failed=failed)


# ===========================================================================
# POST /recruitment/upload-jd
# ===========================================================================

@router.post(
    "/upload-jd",
    response_model=UploadJDResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a job description (text or PDF upload)",
    dependencies=[Depends(HR_OR_ADMIN)],
)
async def upload_job_description(
    title: str = Form(..., min_length=2, max_length=200),
    description: str = Form(..., min_length=10),
    requirements: str | None = Form(None),
    jd_file: UploadFile | None = File(None, description="Optional PDF of the job description"),
    current_user: dict = Depends(get_current_user),
):
    """
    Save a job description. Accepts either:
    - Plain text (title + description + requirements form fields)
    - An optional PDF attachment (uploaded to S3, text extracted and appended)
    """
    from app.ai_utils.s3_uploader import upload_file
    from app.ai_utils.resume_extractor import extract_text

    supabase = get_supabase()
    auth_uid: str = current_user.get("sub", "")

    user_row = (
        supabase.table("users")
        .select("id")
        .eq("auth_user_id", auth_uid)
        .maybe_single()
        .execute()
    )
    creator_id: str | None = user_row.data["id"] if user_row.data else None

    full_description = description

    # If a PDF is provided, extract text and append to description
    if jd_file and jd_file.filename:
        try:
            jd_bytes = await jd_file.read()
            if jd_bytes:
                jd_text = extract_text(jd_bytes, "pdf")
                full_description = f"{description}\n\n--- Extracted from PDF ---\n{jd_text}"
                # Also upload the PDF to S3
                upload_file(
                    file_bytes=jd_bytes,
                    original_filename=jd_file.filename,
                    content_type=jd_file.content_type or "application/pdf",
                    category="job_descriptions",
                )
        except Exception:
            pass  # Non-fatal: still save the text

    # Check if this exact job description already exists
    # We query only by title to avoid URI Too Long errors with very large descriptions
    existing = (
        supabase.table("job_descriptions")
        .select("id, description")
        .eq("title", title)
        .execute()
    )
    if existing and existing.data:
        for record in existing.data:
            if record.get("description") == full_description:
                return UploadJDResponse(
                    id=record["id"],
                    title=title,
                    message="Using existing job description."
                )

    row = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": full_description,
        "requirements": requirements,
        "created_by": creator_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    supabase.table("job_descriptions").insert(row).execute()

    return UploadJDResponse(
        id=row["id"],
        title=title,
        message="Job description saved successfully.",
    )


# ===========================================================================
# POST /recruitment/screen
# ===========================================================================

@router.post(
    "/screen",
    response_model=ScreenResponse,
    summary="Run AI screening: extract → parse → match → rank candidates",
    dependencies=[Depends(HR_OR_ADMIN)],
)
async def screen_candidates(
    payload: ScreenRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Full AI pipeline for a batch of resumes against a job description:
    1. Fetch resume file bytes from S3 (via URL)
    2. Extract text (PDF/DOCX)
    3. Parse structured data with Gemini
    4. Score and analyze match with Gemini + sentence-transformers
    5. Save results to candidates table
    6. Return ranked list

    This may take 30-90 seconds for large batches.
    """
    import httpx

    from app.ai_utils.resume_extractor import extract_text, detect_file_type
    from app.ai_utils.resume_parser import parse_resume
    from app.ai_utils.matcher import screen_candidate

    supabase = get_supabase()
    # Rate limit
    _enforce_screen_rate_limit(current_user.get("sub", "anonymous"))

    # ── Fetch JD ──────────────────────────────────────────────────────────────
    jd_row = (
        supabase.table("job_descriptions")
        .select("*")
        .eq("id", payload.job_description_id)
        .maybe_single()
        .execute()
    )
    if not jd_row.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job description '{payload.job_description_id}' not found.",
        )
    jd = jd_row.data
    jd_text = f"{jd['title']}\n\n{jd['description']}\n\n{jd.get('requirements', '')}"

    # ── Fetch resume metadata ─────────────────────────────────────────────────
    resumes_result = (
        supabase.table("resumes")
        .select("*")
        .in_("id", payload.resume_ids)
        .execute()
    )
    resumes = resumes_result.data or []

    if not resumes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resumes found for the provided IDs.",
        )

    candidates: list[CandidateScoreOut] = []

    async with httpx.AsyncClient(timeout=30.0) as http:
        for resume in resumes:
            file_url: str = resume.get("file_url", "")
            resume_id: str = resume["id"]
            candidate_name: str = resume.get("candidate_name", "Unknown")
            candidate_email: str | None = resume.get("email")

            try:
                # ── Download file ──
                from app.ai_utils.s3_uploader import download_file_bytes
                file_bytes = download_file_bytes(file_url)
                if not file_bytes:
                    resp = await http.get(file_url)
                    resp.raise_for_status()
                    file_bytes = resp.content

                # ── Detect type from URL ──
                filename = file_url.split("/")[-1]
                file_type = detect_file_type(filename)

                # ── Extract text ──
                print(f"[{datetime.now(timezone.utc).isoformat()}] START parsing")
                resume_text = extract_text(file_bytes, file_type)
                print(f"[{datetime.now(timezone.utc).isoformat()}] END parsing")

                # ── Parse structure ──
                print(f"[{datetime.now(timezone.utc).isoformat()}] START AI call (parse)")
                parsed = parse_resume(resume_text)
                print(f"[{datetime.now(timezone.utc).isoformat()}] END AI call (parse)")
                if parsed.get("full_name"):
                    candidate_name = parsed["full_name"]
                if parsed.get("email") and not candidate_email:
                    candidate_email = parsed["email"]

                # ── Score & analyze ──
                print(f"[{datetime.now(timezone.utc).isoformat()}] START scoring")
                result = screen_candidate(resume_text, jd_text, parsed)
                print(f"[{datetime.now(timezone.utc).isoformat()}] END scoring")

                # ── Save to candidates table ──
                print(f"[{datetime.now(timezone.utc).isoformat()}] START database write")
                
                # Update the resumes table with the properly parsed name and email
                if parsed.get("full_name") or parsed.get("email"):
                    supabase.table("resumes").update({
                        "candidate_name": candidate_name,
                        "email": candidate_email
                    }).eq("id", resume_id).execute()

                # Check if this candidate already exists for this job to avoid duplicates
                existing_candidate = (
                    supabase.table("candidates")
                    .select("id")
                    .eq("resume_id", resume_id)
                    .eq("job_id", payload.job_description_id)
                    .maybe_single()
                    .execute()
                )

                if existing_candidate.data:
                    candidate_id = existing_candidate.data["id"]
                    supabase.table("candidates").update({
                        "ai_score": result["ai_score"],
                        "ai_summary": result.get("ai_summary"),
                    }).eq("id", candidate_id).execute()
                else:
                    candidate_id = str(uuid.uuid4())
                    supabase.table("candidates").insert({
                        "id": candidate_id,
                        "resume_id": resume_id,
                        "job_id": payload.job_description_id,
                        "status": "screening",
                        "ai_score": result["ai_score"],
                        "ai_summary": result.get("ai_summary"),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }).execute()

                # ── Also save stage log ──
                supabase.table("candidate_status").insert({
                    "id": str(uuid.uuid4()),
                    "candidate_id": candidate_id,
                    "stage": "screening",
                    "notes": f"AI score: {result['ai_score']}% | {result.get('recommendation', '')}",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).execute()
                print(f"[{datetime.now(timezone.utc).isoformat()}] END database write")

                candidates.append(CandidateScoreOut(
                    candidate_id=candidate_id,
                    resume_id=resume_id,
                    candidate_name=candidate_name,
                    email=candidate_email,
                    ai_score=result["ai_score"],
                    embedding_score=result.get("embedding_score"),
                    recommendation=result.get("recommendation", "Maybe"),
                    recommendation_reason=result.get("recommendation_reason"),
                    ai_summary=result.get("ai_summary"),
                    matched_skills=result.get("matched_skills", []),
                    missing_skills=result.get("missing_skills", []),
                    strengths=result.get("strengths", []),
                    weaknesses=result.get("weaknesses", []),
                    parsed_data=parsed,
                    file_url=file_url,
                ))

            except Exception as exc:
                # Add a failed placeholder so the client knows which ones failed
                candidates.append(CandidateScoreOut(
                    candidate_id=str(uuid.uuid4()),
                    resume_id=resume_id,
                    candidate_name=candidate_name,
                    email=candidate_email,
                    ai_score=0.0,
                    embedding_score=None,
                    recommendation="No",
                    recommendation_reason=f"Processing failed: {exc}",
                    ai_summary=None,
                    matched_skills=[],
                    missing_skills=[],
                    strengths=[],
                    weaknesses=[],
                    parsed_data=None,
                    file_url=file_url,
                ))

    # ── Sort by score descending ──────────────────────────────────────────────
    candidates.sort(key=lambda c: c.ai_score, reverse=True)

    return ScreenResponse(
        job_id=payload.job_description_id,
        job_title=jd["title"],
        total=len(candidates),
        candidates=candidates,
    )


# ===========================================================================
# GET /recruitment/results/{job_id}
# ===========================================================================

@router.get(
    "/results/{job_id}",
    response_model=ResultsResponse,
    summary="Get ranked AI screening results for a job",
    dependencies=[Depends(HR_OR_ADMIN)],
)
async def get_screening_results(
    job_id: str,
    page:          int        = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size:     int        = Query(20, ge=1, le=200, description="Records per page"),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns all candidates for a job from the candidates table,
    joined with resume metadata, sorted by ai_score descending.
    """
    from app.ai_utils.s3_uploader import generate_presigned_url
    
    supabase = get_supabase()

    # Fetch JD
    jd_row = (
        supabase.table("job_descriptions")
        .select("id, title")
        .eq("id", job_id)
        .maybe_single()
        .execute()
    )
    if not jd_row.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job description '{job_id}' not found.",
        )

    # Fetch candidates joined with resumes
    offset = (page - 1) * page_size
    candidates_result = (
        supabase.table("candidates")
        .select("*, resumes(candidate_name, email, file_url)")
        .eq("job_id", job_id)
        .order("ai_score", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    rows = candidates_result.data or []

    candidates = []
    for row in rows:
        resume_meta = row.get("resumes") or {}
        summary_data = {}
        if row.get("ai_summary"):
            import json
            try:
                summary_data = json.loads(row["ai_summary"]) if row["ai_summary"].startswith("{") else {}
            except Exception:
                summary_data = {}

        candidates.append(CandidateScoreOut(
            candidate_id=row["id"],
            resume_id=row["resume_id"],
            candidate_name=resume_meta.get("candidate_name", "Unknown"),
            email=resume_meta.get("email"),
            ai_score=row.get("ai_score", 0.0),
            embedding_score=None,
            recommendation=summary_data.get("recommendation", "Maybe"),
            recommendation_reason=summary_data.get("recommendation_reason"),
            ai_summary=row.get("ai_summary"),
            matched_skills=summary_data.get("matched_skills", []),
            missing_skills=summary_data.get("missing_skills", []),
            strengths=summary_data.get("strengths", []),
            weaknesses=summary_data.get("weaknesses", []),
            parsed_data=None,
            file_url=generate_presigned_url(resume_meta.get("file_url")) if resume_meta.get("file_url") else None,
        ))

    return ResultsResponse(
        job_id=job_id,
        job_title=jd_row.data["title"],
        total=len(candidates),
        page=page,
        page_size=page_size,
        candidates=candidates,
    )


# ===========================================================================
# PATCH /recruitment/candidates/{candidate_id}/status
# ===========================================================================

class StatusUpdateRequest(PM):
    stage: str
    notes: str | None = None


@router.patch(
    "/candidates/{candidate_id}/status",
    summary="Update a candidate's pipeline stage",
    dependencies=[Depends(HR_OR_ADMIN)],
)
async def update_candidate_status(
    candidate_id: str,
    payload: StatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Move a candidate to a new stage (e.g., shortlisted, rejected)."""
    from datetime import datetime, timezone

    supabase = get_supabase()
    auth_uid: str = current_user.get("sub", "")

    user_row = (
        supabase.table("users")
        .select("id")
        .eq("auth_user_id", auth_uid)
        .maybe_single()
        .execute()
    )
    user_id = user_row.data["id"] if user_row.data else None

    valid_stages = {
        "applied", "screening", "interview_scheduled", "interviewed",
        "offer_extended", "offer_accepted", "offer_rejected", "hired", "rejected",
    }
    if payload.stage not in valid_stages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid stage '{payload.stage}'.",
        )

    # Update candidates table status
    supabase.table("candidates").update({"status": payload.stage}).eq("id", candidate_id).execute()

    # Insert status history row
    supabase.table("candidate_status").insert({
        "id": str(uuid.uuid4()),
        "candidate_id": candidate_id,
        "stage": payload.stage,
        "notes": payload.notes,
        "updated_by": user_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {"message": f"Candidate moved to '{payload.stage}' successfully."}


# ===========================================================================
# GET /recruitment/jobs
# ===========================================================================

@router.get(
    "/jobs",
    summary="List all job descriptions with candidate counts",
    dependencies=[Depends(HR_OR_ADMIN)],
)
async def list_jobs(
    current_user: dict = Depends(get_current_user),
):
    """Returns all job descriptions with candidate count per job."""
    supabase = get_supabase()

    try:
        jd_res = (
            supabase.table("job_descriptions")
            .select("id, title, description, requirements, created_at, created_by")
            .order("created_at", desc=True)
            .execute()
        )
        jobs = jd_res.data or []
    except Exception:
        jobs = []

    # Count candidates per job
    job_ids = [j["id"] for j in jobs]
    candidate_counts: dict[str, int] = {jid: 0 for jid in job_ids}

    if job_ids:
        try:
            cand_res = (
                supabase.table("candidates")
                .select("job_id, status")
                .in_("job_id", job_ids)
                .execute()
            )
            for c in (cand_res.data or []):
                jid = c.get("job_id")
                if jid in candidate_counts:
                    candidate_counts[jid] += 1
        except Exception:
            pass

    result = []
    for j in jobs:
        desc = j.get("description") or ""
        result.append({
            "id":               j["id"],
            "title":            j.get("title", "Untitled"),
            "description":      desc[:300] + ("…" if len(desc) > 300 else ""),
            "requirements":     j.get("requirements") or "",
            "candidate_count":  candidate_counts.get(j["id"], 0),
            "created_at":       j.get("created_at", ""),
        })

    return {"total": len(result), "jobs": result}


# ===========================================================================
# GET /recruitment/jobs/{job_id}
# ===========================================================================

@router.get(
    "/jobs/{job_id}",
    summary="Get a single job description with its candidates",
    dependencies=[Depends(HR_OR_ADMIN)],
)
async def get_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Returns full job description plus all candidates linked to it."""
    supabase = get_supabase()

    try:
        jd_res = (
            supabase.table("job_descriptions")
            .select("id, title, description, requirements, created_at")
            .eq("id", job_id)
            .maybe_single()
            .execute()
        )
        job = jd_res.data
    except Exception:
        job = None

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    try:
        cand_res = (
            supabase.table("candidates")
            .select("id, status, ai_score, created_at, resumes(candidate_name, email)")
            .eq("job_id", job_id)
            .order("ai_score", desc=True)
            .execute()
        )
        raw_candidates = cand_res.data or []
    except Exception:
        raw_candidates = []

    candidates_out = []
    for c in raw_candidates:
        meta = c.get("resumes") or {}
        candidates_out.append({
            "id":     c.get("id"),
            "name":   meta.get("candidate_name") or "Unknown",
            "email":  meta.get("email") or "",
            "score":  c.get("ai_score") or 0,
            "status": c.get("status") or "screening",
            "applied_at": c.get("created_at", ""),
        })

    return {
        "job": {
            "id":           job["id"],
            "title":        job.get("title", ""),
            "description":  job.get("description", ""),
            "requirements": job.get("requirements") or "",
            "created_at":   job.get("created_at", ""),
        },
        "candidate_count": len(candidates_out),
        "candidates":      candidates_out,
    }
