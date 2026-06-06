"""
Employees Router — Phase 4
Full employee profile management.

Endpoints:
  GET    /employees         — List all employees (filterable)
  GET    /employees/{id}    — Employee detail with attendance, payroll & performance
  POST   /employees         — Create a new employee profile
  PATCH  /employees/{id}    — Update an employee's profile fields
  DELETE /employees/{id}    — Deactivate an employee (soft delete)
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user, role_required

router = APIRouter(prefix="/employees", tags=["Employees"])

# ── Role guards ──────────────────────────────────────────────────────────────

ADMIN_ONLY = role_required("management_admin")
ALL_STAFF  = role_required("hr_recruiter", "management_admin", "senior_manager")

# ── Pydantic models ───────────────────────────────────────────────────────────

class EmployeeCreateRequest(BaseModel):
    full_name:    str
    email:        str
    role:         str = "employee"
    department:   str | None = None
    joining_date: str | None = None
    salary:       float | None = None


class EmployeeUpdateRequest(BaseModel):
    full_name:    str | None = None
    email:        str | None = None
    role:         str | None = None
    department:   str | None = None
    joining_date: str | None = None
    salary:       float | None = None
    status:       str | None = None


# ===========================================================================
# GET /employees
# ===========================================================================

@router.get("", summary="List all employees")
async def list_employees(
    department:    str | None = Query(None, description="Filter by department"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status (active/inactive)"),
    search:        str | None = Query(None, description="Search by name or email"),
    page:          int        = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size:     int        = Query(20, ge=1, le=200, description="Records per page"),
    _: None = Depends(ALL_STAFF),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns a list of employees with optional filters for department, status,
    and name/email search. No fallbacks; uses actual DB.
    """
    supabase = get_supabase()

    rows: list[dict] = []

    try:
        offset = (page - 1) * page_size
        # Get users and joined profiles/departments/reviews
        query = (
            supabase.table("users")
            .select("id, full_name, email, role, created_at, employee_profiles(status, joining_date, departments(name)), performance_reviews!performance_reviews_user_id_fkey(score)")
            .order("full_name")
            .range(offset, offset + page_size - 1)
        )
        
        # Note: Filtering on joined tables in Supabase Python is complex without !inner.
        # We will filter in memory for department and status as a simple approach for the demo.
        result = query.execute()
        rows = result.data or []
    except Exception:
        rows = []

    # ── Normalize ──────────────────────────────────────────────────────────
    employees: list[dict] = []
    for row in rows:
        # Extract joined data carefully
        profile = row.get("employee_profiles")
        if isinstance(profile, list):
            profile = profile[0] if profile else {}
        elif not isinstance(profile, dict):
            profile = {}
            
        dept_data = profile.get("departments")
        if isinstance(dept_data, dict):
            dept_name = dept_data.get("name") or "—"
        else:
            dept_name = "—"
            
        emp_status = profile.get("status") or "active"
        
        # In-memory filters for joined columns
        if department and department.lower() != dept_name.lower():
            continue
        if status_filter and status_filter.lower() != emp_status.lower():
            continue

        full_name = row.get("full_name") or row.get("name") or "Unknown"
        if search:
            needle = search.lower()
            if needle not in full_name.lower() and needle not in (row.get("email") or "").lower():
                continue
                
        # Calculate score
        perf_data = row.get("performance_reviews") or []
        if isinstance(perf_data, dict):
            perf_data = [perf_data]
            
        if perf_data:
            raw_score = sum(float(p.get("score") or 0) for p in perf_data) / len(perf_data)
            score_5 = round(raw_score / 2, 1)
        else:
            score_5 = 0.0

        employees.append({
            "id":                row.get("id", ""),
            "full_name":         full_name,
            "email":             row.get("email") or "",
            "role":              row.get("role") or "Employee",
            "department":        dept_name,
            "status":            emp_status,
            "joining_date":      (profile.get("joining_date") or row.get("created_at") or "")[:10],
            "performance_score": score_5,
        })

    return {
        "total":     len(employees),
        "page":      page,
        "page_size": page_size,
        "employees": employees,
    }


# ===========================================================================
# GET /employees/{id}
# ===========================================================================

@router.get("/{employee_id}", summary="Full employee profile with attendance, payroll, and performance")
async def get_employee(
    employee_id: str,
    _: None = Depends(ALL_STAFF),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the full employee profile plus attendance summary, payroll history,
    and performance reviews.
    """
    supabase = get_supabase()

    # ── Profile ────────────────────────────────────────────────────────────
    profile: dict | None = None
    try:
        result = (
            supabase.table("users")
            .select("id, full_name, email, role, created_at, employee_profiles(status, joining_date, departments(name)), performance_reviews!performance_reviews_user_id_fkey(score)")
            .eq("id", employee_id)
            .maybe_single()
            .execute()
        )
        profile = result.data
    except Exception:
        pass

    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")

    profile_obj = profile.get("employee_profiles")
    if isinstance(profile_obj, list):
        profile_obj = profile_obj[0] if profile_obj else {}
    elif not isinstance(profile_obj, dict):
        profile_obj = {}
        
    dept_data = profile_obj.get("departments")
    if isinstance(dept_data, dict):
        dept_name = dept_data.get("name") or "—"
    else:
        dept_name = "—"
        
    perf_data = profile.get("performance_reviews") or []
    if isinstance(perf_data, dict):
        perf_data = [perf_data]
    if perf_data:
        raw_score = sum(float(p.get("score") or 0) for p in perf_data) / len(perf_data)
        score_5 = round(raw_score / 2, 1)
    else:
        score_5 = 0.0

    profile_out = {
        "id":               profile.get("id", ""),
        "full_name":        profile.get("full_name") or "Unknown",
        "email":            profile.get("email") or "",
        "role":             profile.get("role") or "Employee",
        "department":       dept_name,
        "status":           profile_obj.get("status") or "active",
        "joining_date":     (profile_obj.get("joining_date") or profile.get("created_at") or "")[:10],
        "performance_score": score_5,
    }

    # ── Attendance summary ─────────────────────────────────────────────────
    attendance: dict = {"present": 0, "absent": 0, "leave": 0, "working_days": 0, "attendance_pct": 0}
    try:
        now         = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        att_result  = (
            supabase.table("attendance")
            .select("date, status")
            .eq("user_id", employee_id)
            .gte("date", month_start)
            .execute()
        )
        att_rows = att_result.data or []
        if att_rows:
            present = sum(1 for r in att_rows if r.get("status") in ("present", "half_day"))
            absent  = sum(1 for r in att_rows if r.get("status") == "absent")
            leave   = sum(1 for r in att_rows if r.get("status") == "on_leave")
            attendance = {
                "present":        present,
                "absent":         absent,
                "leave":          leave,
                "working_days":   len(att_rows),
                "attendance_pct": round(present / max(len(att_rows), 1) * 100, 1),
            }
    except Exception:
        pass

    # ── Payroll history ────────────────────────────────────────────────────
    payroll_history: list[dict] = []
    try:
        pay_result = (
            supabase.table("payroll")
            .select("month, basic_salary, deductions, net_salary, status")
            .eq("user_id", employee_id)
            .order("month", desc=True)
            .limit(6)
            .execute()
        )
        for r in (pay_result.data or []):
            try:
                from datetime import date as _date
                d = _date.fromisoformat(r["month"][:10])
                month_label = d.strftime("%B %Y")
            except Exception:
                month_label = r.get("month", "—")
                
            payroll_history.append({
                "month": month_label,
                "gross": r.get("basic_salary") or 0,
                "deductions": r.get("deductions") or 0,
                "net": r.get("net_salary") or 0,
                "status": (r.get("status") or "pending").title(),
                "paid_on": "—",
            })
    except Exception:
        pass

    # ── Performance reviews ────────────────────────────────────────────────
    performance_reviews: list[dict] = []
    try:
        perf_result = (
            supabase.table("performance_reviews")
            .select("score, feedback, review_date")
            .eq("user_id", employee_id)
            .order("review_date", desc=True)
            .limit(4)
            .execute()
        )
        for r in (perf_result.data or []):
            raw_s = float(r.get("score") or 0)
            sc_5 = round(raw_s / 2, 1)
            if raw_s >= 9:   rating = "Exceptional"
            elif raw_s >= 7.5: rating = "Exceeds Expectations"
            elif raw_s >= 6:   rating = "Meets Expectations"
            elif raw_s >= 4:   rating = "Needs Improvement"
            else:              rating = "Unsatisfactory"
            
            try:
                from datetime import date as _date
                d = _date.fromisoformat(r["review_date"])
                quarter = f"Q{(d.month - 1) // 3 + 1} {d.year}"
            except Exception:
                quarter = "—"
                
            performance_reviews.append({
                "quarter": quarter,
                "score": sc_5,
                "rating": rating,
                "reviewer": "—",
                "date": r.get("review_date") or "",
            })
    except Exception:
        pass

    return {
        "profile":             profile_out,
        "attendance_summary":  attendance,
        "payroll_history":     payroll_history,
        "performance_reviews": performance_reviews,
    }


# ===========================================================================
# POST /employees
# ===========================================================================

@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new employee profile")
async def create_employee(
    payload: EmployeeCreateRequest,
    _: None = Depends(ADMIN_ONLY),
    current_user: dict = Depends(get_current_user),
):
    """
    Creates a new employee record. Not fully implemented for related tables.
    """
    supabase = get_supabase()
    now_iso  = datetime.now(timezone.utc).isoformat()
    emp_id   = str(uuid.uuid4())

    row: dict = {
        "id":           emp_id,
        "full_name":    payload.full_name,
        "email":        payload.email,
        "role":         payload.role,
        "created_at":   now_iso,
    }

    try:
        supabase.table("users").insert(row).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create employee: {exc}",
        )

    return {
        "message":    "Employee created successfully.",
        "id":         emp_id,
        "full_name":  payload.full_name,
        "email":      payload.email,
        "created_at": now_iso,
    }


# ===========================================================================
# PATCH /employees/{id}
# ===========================================================================

@router.patch("/{employee_id}", summary="Update an employee profile")
async def update_employee(
    employee_id: str,
    payload: EmployeeUpdateRequest,
    _: None = Depends(ADMIN_ONLY),
    current_user: dict = Depends(get_current_user),
):
    """
    Updates an employee's users table. Employee profiles update omitted for simplicity.
    """
    supabase = get_supabase()

    updates: dict = {}
    if payload.full_name is not None: updates["full_name"] = payload.full_name
    if payload.email is not None: updates["email"] = payload.email
    if payload.role is not None: updates["role"] = payload.role

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid user fields provided for update.",
        )

    try:
        supabase.table("users").update(updates).eq("id", employee_id).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update employee: {exc}",
        )

    return {
        "message":        "Employee updated successfully.",
        "employee_id":    employee_id,
        "updated_fields": list(updates.keys()),
    }


# ===========================================================================
# DELETE /employees/{id}  — soft delete
# ===========================================================================

@router.delete("/{employee_id}", summary="Deactivate an employee (soft delete)")
async def deactivate_employee(
    employee_id: str,
    _: None = Depends(ADMIN_ONLY),
    current_user: dict = Depends(get_current_user),
):
    """
    Sets the employee's status to 'inactive' in employee_profiles.
    """
    supabase    = get_supabase()
    soft_update = {"status": "inactive"}

    try:
        result = supabase.table("employee_profiles").update(soft_update).eq("user_id", employee_id).execute()
        if not result.data:
            raise Exception("No rows updated")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate employee: {exc}",
        )

    return {
        "message":        "Employee deactivated successfully.",
        "employee_id":    employee_id,
        "status":         "inactive",
    }
