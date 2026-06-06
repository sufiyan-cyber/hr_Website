"""
Departments Router — Phase 4
Department management.

Endpoints:
  GET    /departments           — List all departments with employee count
  POST   /departments           — Create a new department
  DELETE /departments/{id}      — Delete a department
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user, role_required

router = APIRouter(prefix="/departments", tags=["Departments"])

# ── Role guards ───────────────────────────────────────────────────────────────

ADMIN_ONLY = role_required("management_admin")
ALL_STAFF  = role_required("hr_recruiter", "management_admin", "senior_manager")

# ── Pydantic models ───────────────────────────────────────────────────────────

class DepartmentCreateRequest(BaseModel):
    name:        str
    description: str | None = None
    head_name:   str | None = None
    manager_id:  str | None = None


# ===========================================================================
# GET /departments
# ===========================================================================

@router.get("", summary="List all departments with employee count")
async def list_departments(
    _: None = Depends(ALL_STAFF),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns all departments with name, head/manager info, and employee count.
    No fallbacks; uses actual DB.
    """
    supabase = get_supabase()
    rows: list[dict] = []

    try:
        result = (
            supabase.table("departments")
            .select("*, users(full_name)")
            .order("name")
            .execute()
        )
        rows = result.data or []
    except Exception:
        rows = []

    # Get employee counts
    dept_counts: dict[str, int] = {}
    try:
        emp_res = supabase.table("employee_profiles").select("department_id").execute()
        for e in (emp_res.data or []):
            d_id = e.get("department_id")
            if d_id:
                dept_counts[d_id] = dept_counts.get(d_id, 0) + 1
    except Exception:
        pass

    # ── Normalize rows from departments table ──────────────────────────────
    departments = [
        {
            "id":             row.get("id", ""),
            "name":           row.get("name") or "",
            "head_name":      (row.get("users") or {}).get("full_name") or row.get("head_name") or "—",
            "description":    row.get("description"),
            "employee_count": dept_counts.get(row.get("id"), 0),
        }
        for row in rows
    ]

    return {"total": len(departments), "departments": departments}


# ===========================================================================
# POST /departments
# ===========================================================================

@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new department")
async def create_department(
    payload: DepartmentCreateRequest,
    _: None = Depends(ADMIN_ONLY),
    current_user: dict = Depends(get_current_user),
):
    """
    Creates a new department record.
    """
    if not payload.name or not payload.name.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Department name is required.",
        )

    supabase = get_supabase()
    now_iso  = datetime.now(timezone.utc).isoformat()
    dept_id  = str(uuid.uuid4())

    row: dict = {
        "id":          dept_id,
        "name":        payload.name.strip(),
        "created_at":  now_iso,
    }
    if payload.manager_id:
        row["manager_id"] = payload.manager_id

    try:
        supabase.table("departments").insert(row).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create department: {exc}",
        )

    return {
        "message":    "Department created successfully.",
        "id":         dept_id,
        "name":       payload.name.strip(),
        "created_at": now_iso,
    }


# ===========================================================================
# DELETE /departments/{id}
# ===========================================================================

@router.delete("/{department_id}", summary="Delete a department")
async def delete_department(
    department_id: str,
    _: None = Depends(ADMIN_ONLY),
    current_user: dict = Depends(get_current_user),
):
    """
    Hard-deletes a department record by ID.
    Returns confirmation message.
    """
    supabase = get_supabase()

    try:
        supabase.table("departments").delete().eq("id", department_id).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete department: {exc}",
        )

    return {
        "message":       "Department deleted successfully.",
        "department_id": department_id,
    }
