"""
Resume Parser — Phase 2

Uses Google Gemini API to parse raw resume text into structured JSON.
Extracts: name, email, phone, skills, education, experience, certifications.
"""

import json
import os
import re
from typing import Any


# ---------------------------------------------------------------------------
# Gemini client (lazy-loaded)
# ---------------------------------------------------------------------------

_gemini_client = None


def _get_gemini():
    global _gemini_client
    if _gemini_client is None:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set.")
        genai.configure(api_key=api_key)
        _gemini_client = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={
                "temperature": 0.1,      # Low temp for deterministic extraction
                "response_mime_type": "application/json",
            },
        )
    return _gemini_client


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

PARSE_PROMPT = """
You are an expert HR data extraction system. Extract structured information from the resume text below.

Return ONLY valid JSON matching this exact schema. If a field is missing, use null or an empty list.

{
  "full_name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "skills": ["skill1", "skill2", ...],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string or null",
      "gpa": "string or null"
    }
  ],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "description": "string or null"
    }
  ],
  "certifications": ["cert1", "cert2", ...],
  "languages": ["English", ...],
  "total_experience_years": number or null
}

RESUME TEXT:
---
{resume_text}
---

Return ONLY the JSON object. No markdown, no explanation.
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_resume(resume_text: str) -> dict[str, Any]:
    """
    Parse raw resume text into structured data using Gemini.

    Args:
        resume_text: Plain text extracted from a PDF/DOCX resume.

    Returns:
        Dict with structured candidate information.
    """
    if not resume_text or len(resume_text.strip()) < 50:
        return _empty_result()

    # Truncate to avoid token limits (keep first 8000 chars)
    truncated = resume_text[:8000]

    prompt = PARSE_PROMPT.replace("{resume_text}", truncated)

    model = _get_gemini()

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s*```$", "", raw)

        parsed = json.loads(raw)
        return _sanitize(parsed)

    except json.JSONDecodeError:
        # If Gemini returns malformed JSON, return empty but don't crash
        return _empty_result()
    except Exception as exc:
        raise RuntimeError(f"Gemini resume parsing failed: {exc}") from exc


def _empty_result() -> dict:
    return {
        "full_name": None,
        "email": None,
        "phone": None,
        "location": None,
        "skills": [],
        "education": [],
        "experience": [],
        "certifications": [],
        "languages": [],
        "total_experience_years": None,
    }


def _sanitize(data: dict) -> dict:
    """Ensure all expected keys exist and are the right type."""
    base = _empty_result()
    for key in base:
        if key not in data:
            data[key] = base[key]
    # Ensure lists are actually lists
    for list_key in ("skills", "education", "experience", "certifications", "languages"):
        if not isinstance(data.get(list_key), list):
            data[list_key] = []
    return data
