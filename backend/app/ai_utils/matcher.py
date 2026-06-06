"""
AI Matcher & Scorer — Phase 2

Combines:
1. Semantic similarity via sentence-transformers (cosine similarity score)
2. Gemini API for qualitative analysis: skills match, recommendation, summary
"""

import json
import os
import re
from typing import Any

import numpy as np


# ---------------------------------------------------------------------------
# Embedding model (lazy-loaded, cached)
# ---------------------------------------------------------------------------

_embedding_model = None


def _get_embedder():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        # all-MiniLM-L6-v2 is fast, small, and excellent for semantic matching
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def compute_similarity_score(resume_text: str, jd_text: str) -> float:
    """
    Compute semantic similarity between a resume and a job description.
    Returns a score from 0.0 to 100.0.
    """
    model = _get_embedder()

    # Truncate to avoid OOM for very long docs
    r_trunc = resume_text[:4000]
    j_trunc = jd_text[:2000]

    embeddings = model.encode([r_trunc, j_trunc])
    similarity = _cosine_similarity(embeddings[0], embeddings[1])

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
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        genai.configure(api_key=api_key)
        _gemini_client = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={
                "temperature": 0.3,
                "response_mime_type": "application/json",
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
        response = model.generate_content(prompt)
        raw = response.text.strip()

        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)
        return _sanitize_match(result)

    except json.JSONDecodeError:
        return _empty_match()
    except Exception as exc:
        raise RuntimeError(f"Gemini match analysis failed: {exc}") from exc


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
