"""
Candidate Scorer — placeholder for Phase 2.

Will implement:
- Cosine similarity between resume embeddings and JD embeddings
- LLM-based qualitative scoring via Gemini / OpenAI
- Structured score breakdown (skills match, experience, education)
"""


def score_candidate(resume_text: str, jd_text: str) -> dict:
    """
    Score a candidate against a job description.
    Returns a dict with numeric score and AI-generated summary.
    Placeholder — not yet implemented.
    """
    raise NotImplementedError("Candidate scorer will be implemented in Phase 2.")
