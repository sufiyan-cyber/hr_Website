"""
Role-Based Access Control (RBAC) Middleware

Reads the user role placed on request.state by SupabaseJWTMiddleware and
enforces path-level permissions. Route handlers may further restrict access
using the role_required dependency.

Role hierarchy (most → least privileged):
  management_admin > hr_recruiter > senior_manager > employee
"""

from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# ---------------------------------------------------------------------------
# Route → allowed roles mapping
# A role in this dict means *that role and above* have access.
# Routes not listed here are accessible by any authenticated user.
# ---------------------------------------------------------------------------

ROUTE_PERMISSIONS: dict[str, set[str]] = {
    # Recruitment routes — hr_recruiter and management_admin
    "/api/v1/recruitment": {"hr_recruiter", "management_admin"},
    "/api/v1/resumes": {"hr_recruiter", "management_admin"},
    "/api/v1/candidates": {"hr_recruiter", "management_admin"},
    "/api/v1/job-descriptions": {"hr_recruiter", "management_admin"},

    # Employee / department management — senior_manager and above
    "/api/v1/employees": {"senior_manager", "hr_recruiter", "management_admin"},
    "/api/v1/departments": {"senior_manager", "hr_recruiter", "management_admin"},

    # Performance — senior_manager and above
    "/api/v1/performance": {"senior_manager", "management_admin"},

    # Payroll — management_admin only
    "/api/v1/payroll": {"management_admin"},
}

EXEMPT_PATHS: set[str] = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}


class RBACMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces role-based access control.
    Must run *after* SupabaseJWTMiddleware so request.state.user_role is set.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Pass CORS preflight requests through — same reason as SupabaseJWTMiddleware.
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip RBAC for public routes
        if request.url.path in EXEMPT_PATHS or request.url.path.startswith("/docs"):
            return await call_next(request)

        # If JWT middleware did not set the role (e.g., request was rejected),
        # pass through — the 401 is already being returned upstream.
        user_role: str | None = getattr(request.state, "user_role", None)
        if not user_role:
            return await call_next(request)

        # Check route permissions
        for route_prefix, allowed_roles in ROUTE_PERMISSIONS.items():
            if request.url.path.startswith(route_prefix):
                if user_role not in allowed_roles:
                    return JSONResponse(
                        status_code=403,
                        content={
                            "detail": (
                                f"Role '{user_role}' does not have permission "
                                f"to access this resource."
                            )
                        },
                    )
                break  # Stop at first matching prefix

        return await call_next(request)
