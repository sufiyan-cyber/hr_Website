"""
Auth Router — Phase 1
Endpoints:
  POST /auth/validate-token  — Validate Supabase JWT → return user role + profile
  GET  /auth/me              — Return current user profile from public.users table
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.database.supabase_client import get_supabase
from app.middleware.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class TokenPayload(BaseModel):
    """Request body for /auth/validate-token"""
    token: str


class UserRoleResponse(BaseModel):
    """Common response shape for user + role info"""
    user_id:   str
    auth_uid:  str
    email:     str
    full_name: str | None
    role:      str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/validate-token",
    response_model=UserRoleResponse,
    summary="Validate a Supabase JWT and return user role + profile",
    description=(
        "Accepts a raw Supabase access token, decodes it via the JWT middleware "
        "(which runs automatically on all non-exempt routes), then looks up the "
        "user's record in the public.users table to return their role and profile."
    ),
)
async def validate_token(
    request: Request,
    # The SupabaseJWTMiddleware already decoded the token and set request.state.user.
    # We just need the decoded payload from the dependency.
    current_user: dict = Depends(get_current_user),
):
    """
    Called by the frontend on app load to verify the session is still valid
    and to retrieve the latest role from the database (not just the JWT metadata).
    """
    auth_uid: str = current_user.get("sub", "")
    if not auth_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject claim.",
        )

    supabase = get_supabase()

    # Fetch the user record from public.users
    result = (
        supabase.table("users")
        .select("id, email, full_name, role, auth_user_id")
        .eq("auth_user_id", auth_uid)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. The account may not be fully set up.",
        )

    row = result.data
    return UserRoleResponse(
        user_id=   str(row["id"]),
        auth_uid=  str(row["auth_user_id"]),
        email=     row["email"],
        full_name= row.get("full_name"),
        role=      row.get("role", "employee"),
    )


@router.get(
    "/me",
    response_model=UserRoleResponse,
    summary="Get the current authenticated user's profile",
    description=(
        "Returns the user's profile from the public.users table based on "
        "the sub claim in the provided JWT. Requires a valid Bearer token."
    ),
)
async def get_me(
    current_user: dict = Depends(get_current_user),
):
    """
    Frontend calls this to populate the auth context after a page refresh
    or to display user info in the navbar/sidebar.
    """
    auth_uid: str = current_user.get("sub", "")
    if not auth_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )

    supabase = get_supabase()

    result = (
        supabase.table("users")
        .select("id, email, full_name, role, auth_user_id")
        .eq("auth_user_id", auth_uid)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found.",
        )

    row = result.data
    return UserRoleResponse(
        user_id=   str(row["id"]),
        auth_uid=  str(row["auth_user_id"]),
        email=     row["email"],
        full_name= row.get("full_name"),
        role=      row.get("role", "employee"),
    )
