"""
Payroll Router — aligned with actual schema.sql
payroll table columns:
  id, user_id (NOT employee_id), month (DATE e.g. '2026-06-01'),
  basic_salary, deductions, net_salary (generated), status (payroll_status ENUM)
  NO: gross, net, month_label, paid_on, notes, created_at, updated_at

payroll_status ENUM: 'pending' | 'processed' | 'paid' | 'failed'
"""

from datetime import date

from fastapi import APIRouter, Depends

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user, role_required

router = APIRouter(prefix="/payroll", tags=["Payroll"])

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


def _fmt(amount) -> str:
    try:
        return f"₹{float(amount):,.0f}"
    except Exception:
        return "₹0"


def _month_label(month_str: str) -> str:
    """Convert '2026-06-01' or '2026-06' → 'June 2026'"""
    try:
        d = date.fromisoformat(month_str[:10])
        return d.strftime("%B %Y")
    except Exception:
        return month_str


# ===========================================================================
# GET /payroll/me
# ===========================================================================

@router.get("/me", summary="Get current employee payroll history")
async def get_my_payroll(
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
                supabase.table("payroll")
                .select("id, month, basic_salary, deductions, net_salary, status")
                .eq("user_id", user_id)
                .order("month", desc=True)
                .limit(12)
                .execute()
            )
            records = result.data or []
        except Exception:
            pass

    formatted = []
    for r in records:
        month_str = r.get("month", "")
        formatted.append({
            "id":             r.get("id"),
            "month":          month_str,
            "month_label":    _month_label(month_str),
            "gross":          r.get("basic_salary") or 0,
            "deductions":     r.get("deductions") or 0,
            "net":            r.get("net_salary") or 0,
            "gross_fmt":      _fmt(r.get("basic_salary")),
            "deductions_fmt": _fmt(r.get("deductions")),
            "net_fmt":        _fmt(r.get("net_salary")),
            "status":         (r.get("status") or "pending").title(),
            "paid_on":        "—",
        })

    latest = formatted[0] if formatted else None

    return {
        "has_records": len(formatted) > 0,
        "latest":      latest,
        "history":     formatted,
    }
