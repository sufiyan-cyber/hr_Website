"""
Performance Router — aligned with actual schema.sql
performance_reviews table columns:
  id, user_id (NOT employee_id), reviewer_id, score (0-10 NOT 0-5),
  feedback (NOT comments), review_date
  NO: quarter, rating TEXT, reviewer TEXT, created_at, updated_at
"""

from fastapi import APIRouter, Depends

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user, role_required

router = APIRouter(prefix="/performance", tags=["Performance"])

EMPLOYEE_ONLY = role_required("employee")


def _get_user_id(supabase, auth_uid: str) -> str | None:
    try:
        row = (
            supabase.table("users")
            .select("id")
            .eq("auth_user_id", auth_uid)
            .maybe_single()
            .execute()
        )
        return (row.data or {}).get("id")
    except Exception:
        return None


def _score_to_rating(score: float) -> str:
    """Convert 0-10 score to a human-readable rating label."""
    if score >= 9:   return "Exceptional"
    if score >= 7.5: return "Exceeds Expectations"
    if score >= 6:   return "Meets Expectations"
    if score >= 4:   return "Needs Improvement"
    return "Unsatisfactory"


# ===========================================================================
# GET /performance/me
# ===========================================================================

@router.get("/me", summary="Get current employee performance reviews")
async def get_my_performance(
    _: None = Depends(EMPLOYEE_ONLY),
    current_user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    auth_uid = current_user.get("sub", "")
    user_id  = _get_user_id(supabase, auth_uid)

    records = []
    if user_id:
        try:
            result = (
                supabase.table("performance_reviews")
                .select("id, score, feedback, review_date, reviewer_id")
                .eq("user_id", user_id)
                .order("review_date", desc=True)
                .limit(8)
                .execute()
            )
            records = result.data or []
        except Exception:
            pass

    # Normalise for the frontend — score in DB is 0-10, frontend expects 0-5
    normalised = []
    for r in records:
        raw_score = float(r.get("score") or 0)
        score_5   = round(raw_score / 2, 1)   # 0-10 → 0-5
        rd        = r.get("review_date", "")
        # Derive a quarter label from review_date
        try:
            from datetime import date
            d = date.fromisoformat(rd)
            quarter = f"Q{(d.month - 1) // 3 + 1} {d.year}"
        except Exception:
            quarter = "—"

        normalised.append({
            "id":          r.get("id"),
            "score":       score_5,
            "raw_score":   raw_score,
            "rating":      _score_to_rating(raw_score),
            "comments":    r.get("feedback") or "",
            "reviewer":    None,  # reviewer_id is a UUID — no name join for now
            "review_date": rd,
            "quarter":     quarter,
        })

    avg_score = (
        round(sum(r["score"] for r in normalised) / len(normalised), 2)
        if normalised else 0.0
    )

    return {
        "has_records": len(normalised) > 0,
        "avg_score":   avg_score,
        "latest":      normalised[0] if normalised else None,
        "reviews":     normalised,
    }
