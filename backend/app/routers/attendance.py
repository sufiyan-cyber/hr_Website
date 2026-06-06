"""
Attendance Router — aligned with actual schema.sql
attendance table columns:
  id, user_id (NOT employee_id), date, status (attendance_status ENUM),
  check_in (TIMETZ), check_out (TIMETZ)
  NO: notes, created_at, updated_at, month_label

attendance_status ENUM: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday'
"""

from calendar import monthrange
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user, role_required

router = APIRouter(prefix="/attendance", tags=["Attendance"])

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


# ===========================================================================
# GET /attendance/me
# ===========================================================================

@router.get("/me", summary="Get current employee attendance records")
async def get_my_attendance(
    year:  int = Query(None),
    month: int = Query(None),
    _: None = Depends(EMPLOYEE_ONLY),
    current_user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    auth_uid = current_user.get("sub", "")
    user_id  = _get_user_id(supabase, auth_uid)

    now   = datetime.now(timezone.utc)
    year  = year  or now.year
    month = month or now.month

    _, last_day = monthrange(year, month)
    from_date = date(year, month, 1).isoformat()
    to_date   = date(year, month, last_day).isoformat()

    records = []
    if user_id:
        try:
            result = (
                supabase.table("attendance")
                .select("id, date, status, check_in, check_out")
                .eq("user_id", user_id)
                .gte("date", from_date)
                .lte("date", to_date)
                .order("date", desc=False)
                .execute()
            )
            records = result.data or []
        except Exception:
            pass

    # Count by status
    present  = sum(1 for r in records if r["status"] in ("present", "half_day"))
    absent   = sum(1 for r in records if r["status"] == "absent")
    on_leave = sum(1 for r in records if r["status"] == "on_leave")
    total    = len(records)
    pct      = round(present / total * 100) if total > 0 else 0

    return {
        "year":        year,
        "month":       month,
        "month_label": date(year, month, 1).strftime("%B %Y"),
        "has_records": total > 0,
        "summary": {
            "present":        present,
            "absent":         absent,
            "leave":          on_leave,
            "working_days":   total,
            "attendance_pct": pct,
        },
        "records": records,
    }


# ===========================================================================
# GET /attendance/summary  (6-month trend)
# ===========================================================================

@router.get("/summary", summary="6-month attendance trend for current employee")
async def get_attendance_summary(
    _: None = Depends(EMPLOYEE_ONLY),
    current_user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    auth_uid = current_user.get("sub", "")
    user_id  = _get_user_id(supabase, auth_uid)

    now   = datetime.now(timezone.utc)
    trend = []

    for i in range(5, -1, -1):
        ref   = now.replace(day=1) - timedelta(days=i * 28)
        yr, mo = ref.year, ref.month
        _, ld  = monthrange(yr, mo)
        from_d = date(yr, mo, 1).isoformat()
        to_d   = date(yr, mo, ld).isoformat()

        present = total = 0
        if user_id:
            try:
                res = (
                    supabase.table("attendance")
                    .select("status")
                    .eq("user_id", user_id)
                    .gte("date", from_d)
                    .lte("date", to_d)
                    .execute()
                )
                rows    = res.data or []
                total   = len(rows)
                present = sum(1 for r in rows if r["status"] in ("present", "half_day"))
            except Exception:
                pass

        trend.append({
            "month":        date(yr, mo, 1).strftime("%b '%y"),
            "present":      present,
            "working_days": total,
            "pct":          round(present / total * 100) if total > 0 else 0,
        })

    return {"trend": trend}
