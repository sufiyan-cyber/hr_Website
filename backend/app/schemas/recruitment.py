"""
Recruitment Schemas — Phase 2
Pydantic request/response models for the recruitment endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Job Description
# ---------------------------------------------------------------------------

class JobDescriptionCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=10)
    requirements: str | None = None


class JobDescriptionOut(BaseModel):
    id: str
    title: str
    description: str
    requirements: str | None
    created_by: str | None
    created_at: datetime | None


# ---------------------------------------------------------------------------
# Resume Upload
# ---------------------------------------------------------------------------

class ResumeMetaOut(BaseModel):
    id: str
    candidate_name: str
    email: str | None
    file_url: str
    created_at: datetime | None


class UploadResumesResponse(BaseModel):
    uploaded: list[ResumeMetaOut]
    failed:   list[dict[str, str]]   # [{ filename, reason }]


class UploadJDResponse(BaseModel):
    id: str
    title: str
    message: str


# ---------------------------------------------------------------------------
# Screening
# ---------------------------------------------------------------------------

class ScreenRequest(BaseModel):
    job_description_id: str = Field(..., description="UUID of the job description row")
    resume_ids:         list[str] = Field(
        ..., min_length=1, max_length=50,
        description="UUIDs of the resume rows to screen"
    )


class SkillChip(BaseModel):
    name: str


class CandidateScoreOut(BaseModel):
    candidate_id:           str
    resume_id:              str
    candidate_name:         str
    email:                  str | None
    ai_score:               float = Field(..., ge=0, le=100)
    embedding_score:        float | None
    recommendation:         str       # Strong Yes / Yes / Maybe / No
    recommendation_reason:  str | None
    ai_summary:             str | None
    matched_skills:         list[str]
    missing_skills:         list[str]
    strengths:              list[str]
    weaknesses:             list[str]
    parsed_data:            dict[str, Any] | None  # Full structured resume
    file_url:               str | None


class ScreenResponse(BaseModel):
    job_id:     str
    job_title:  str
    total:      int
    candidates: list[CandidateScoreOut]


class ResultsResponse(BaseModel):
    job_id:     str
    job_title:  str
    total:      int
    page:       int | None = None
    page_size:  int | None = None
    candidates: list[CandidateScoreOut]
