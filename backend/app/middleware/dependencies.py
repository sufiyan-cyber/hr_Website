"""
RBAC dependency for individual route handlers.

Usage:
    from app.middleware.dependencies import role_required

    @router.get("/admin-only")
    async def admin_endpoint(
        _: None = Depends(role_required("management_admin"))
    ):
        ...
"""

from fastapi import Depends, HTTPException, Request, status


def get_current_user(request: Request) -> dict:
    """Extract the decoded JWT payload from request state."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    return user


def get_current_role(request: Request) -> str:
    """Extract the user role from request state."""
    return getattr(request.state, "user_role", "employee")


def role_required(*allowed_roles: str):
    """
    FastAPI dependency factory that raises 403 if the user's role is not
    in the list of allowed roles.

    Example:
        Depends(role_required("management_admin", "hr_recruiter"))
    """

    def _check_role(role: str = Depends(get_current_role)) -> None:
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' is not authorized for this action.",
            )

    return _check_role
