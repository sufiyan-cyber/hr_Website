"""
AI Matcher & Scorer — Phase 2

Combines:
1. Semantic similarity via sentence-transformers (cosine similarity score)
2. Gemini API for qualitative analysis: skills match, recommendation, summary
"""

import json
import math
import os
import re
import time
from typing import Any

import google.generativeai as genai


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
                print(f"[matcher] Rate limit hit (attempt {attempt + 1}/{max_retries}). "
                      f"Retrying in {delay:.0f}s...")
                time.sleep(delay)
                delay *= 2
            else:
                raise


# ---------------------------------------------------------------------------
# Gemini Configuration & Embeddings
# ---------------------------------------------------------------------------

_gemini_configured = False


def _ensure_gemini_configured():
    global _gemini_configured
    if not _gemini_configured:
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        genai.configure(api_key=api_key)
        _gemini_configured = True


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))


def compute_similarity_score(resume_text: str, jd_text: str) -> float:
    """
    Compute semantic similarity between a resume and a job description.
    Returns a score from 0.0 to 100.0.
    """
    try:
        _ensure_gemini_configured()

        # Truncate to avoid OOM or token limits
        r_trunc = resume_text[:4000]
        j_trunc = jd_text[:2000]

        # Generate embeddings using gemini-embedding-001 (with retry)
        def _do_embed():
            return genai.embed_content(
                model="models/gemini-embedding-001",
                content=[r_trunc, j_trunc],
                task_type="semantic_similarity",
                request_options={"timeout": 15.0}
            )

        response = _call_with_retry(_do_embed)
        embeddings = response["embedding"]
        similarity = _cosine_similarity(embeddings[0], embeddings[1])
    except Exception as e:
        print(f"Error computing similarity score: {e}")
        # Default fallback similarity score (neutral)
        similarity = 0.0

    # Map from [-1, 1] to [0, 100]
    score = (similarity + 1) / 2 * 100
    return round(min(max(score, 0.0), 100.0), 1)


# ---------------------------------------------------------------------------
# Gemini qualitative analysis
# ---------------------------------------------------------------------------

_gemini_client = None


def _get_gemini():
    global _gemini_client
    if _gemini_client is None:
        _ensure_gemini_configured()
        _gemini_client = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                # NOTE: Do NOT set response_mime_type="application/json" here.
                # The 0.7/0.8 SDK + gemini-2.0-flash silently drops the response
                # when that constraint is active. We parse JSON manually instead.
                "temperature": 0.3,
            },
        )
    return _gemini_client


MATCH_PROMPT = """
You are an expert technical recruiter. Analyze this candidate's resume against the job description.

Return ONLY valid JSON with this exact schema:

{
  "matched_skills": ["skill1", "skill2", ...],
  "missing_skills": ["skill1", "skill2", ...],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendation": "Strong Yes" | "Yes" | "Maybe" | "No",
  "recommendation_reason": "One sentence explanation",
  "ai_summary": "3-line paragraph summarizing candidate fit for this role."
}

JOB DESCRIPTION:
---
{jd_text}
---

CANDIDATE RESUME:
---
{resume_text}
---

Return ONLY the JSON. No markdown. No explanation.
"""


def analyze_match(
    resume_text: str,
    jd_text: str,
    parsed_resume: dict | None = None,
) -> dict[str, Any]:
    """
    Use Gemini to generate qualitative match analysis.

    Args:
        resume_text:    Raw resume text.
        jd_text:        Job description text.
        parsed_resume:  Optional structured data from resume_parser.parse_resume().

    Returns:
        Dict with matched_skills, missing_skills, strengths, weaknesses,
        recommendation, recommendation_reason, ai_summary.
    """
    model = _get_gemini()

    r_trunc = resume_text[:4000]
    j_trunc = jd_text[:2000]

    prompt = MATCH_PROMPT.replace("{resume_text}", r_trunc).replace("{jd_text}", j_trunc)

    try:
        response = _call_with_retry(
            model.generate_content,
            prompt,
            request_options={"timeout": 45.0}
        )
        raw = response.text.strip()

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)
        return _sanitize_match(result)

    except json.JSONDecodeError as exc:
        print(f"[matcher] JSON decode error — raw response may be malformed: {exc}")
        return _empty_match()
    except Exception as exc:
        # Surface the real error in recommendation_reason so it shows in the UI
        err_msg = str(exc)[:200]
        print(f"[matcher] Gemini analyze_match failed: {err_msg}")
        result = _empty_match()
        result["recommendation_reason"] = f"AI error: {err_msg}"
        return result


def _empty_match() -> dict:
    return {
        "matched_skills": [],
        "missing_skills": [],
        "strengths": [],
        "weaknesses": [],
        "recommendation": "Maybe",
        "recommendation_reason": "Unable to analyze",
        "ai_summary": "Analysis unavailable.",
    }


def _sanitize_match(data: dict) -> dict:
    base = _empty_match()
    for key in base:
        if key not in data:
            data[key] = base[key]
    for list_key in ("matched_skills", "missing_skills", "strengths", "weaknesses"):
        if not isinstance(data.get(list_key), list):
            data[list_key] = []
    valid_recs = {"Strong Yes", "Yes", "Maybe", "No"}
    if data.get("recommendation") not in valid_recs:
        data["recommendation"] = "Maybe"
    return data


# ---------------------------------------------------------------------------
# Combined pipeline
# ---------------------------------------------------------------------------

def screen_candidate(
    resume_text: str,
    jd_text: str,
    parsed_resume: dict | None = None,
) -> dict[str, Any]:
    """
    Run the full screening pipeline for one candidate:
    1. Compute embedding cosine-similarity score
    2. Run Gemini qualitative analysis
    3. Blend into a final score

    Returns a combined result dict.
    """
    # Embedding score (40% weight — objective)
    embedding_score = compute_similarity_score(resume_text, jd_text)

    # Small delay between sequential Gemini calls to avoid hitting RPM limits
    time.sleep(2)

    # Gemini qualitative analysis (60% weight via recommendation)
    match_result = analyze_match(resume_text, jd_text, parsed_resume)

    # Boost/adjust score based on Gemini recommendation
    rec = match_result.get("recommendation", "Maybe")
    bonus_map = {"Strong Yes": 12, "Yes": 5, "Maybe": 0, "No": -10}
    bonus = bonus_map.get(rec, 0)

    final_score = round(min(max(embedding_score + bonus, 0.0), 100.0), 1)

    return {
        "ai_score": final_score,
        "embedding_score": embedding_score,
        **match_result,
    }
