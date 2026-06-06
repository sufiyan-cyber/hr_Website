"""
Supabase JWT Validation Middleware

Validates the Authorization: Bearer <token> header on every request by calling
Supabase's own auth service (supabase.auth.get_user). This approach works with
any algorithm Supabase uses (HS256, ES256, etc.) and does not require the
private/signing key on the backend.

Public routes (listed in EXEMPT_PATHS) skip validation entirely.
"""

from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.database.supabase_client import get_supabase

# Routes that do not require authentication
EXEMPT_PATHS: set[str] = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}


class SupabaseJWTMiddleware(BaseHTTPMiddleware):
    """
    Middleware that validates Supabase-issued JWTs on every request.

    Delegates verification to the Supabase auth service so it works with
    ES256, HS256, or any other algorithm Supabase may use.

    On success  → attaches user info and role to request.state
    On failure  → returns 401 JSON response
    Exempt paths → passes through without validation
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Always pass CORS preflight requests through — browsers send OPTIONS
        # automatically and cannot attach an Authorization header.
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip validation for public routes
        if request.url.path in EXEMPT_PATHS or request.url.path.startswith("/docs"):
            return await call_next(request)

        authorization: str | None = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid Authorization header."},
            )

        token = authorization.removeprefix("Bearer ").strip()

        # Validate the token using Supabase's own auth service.
        # This works with any signing algorithm (ES256, HS256 …) because
        # Supabase verifies the signature on its side.
        try:
            supabase = get_supabase()
            user_response = supabase.auth.get_user(jwt=token)
            user = user_response.user
            if not user:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or expired token."},
                )
        except Exception as exc:
            return JSONResponse(
                status_code=401,
                content={"detail": f"Token verification failed: {exc}"},
            )

        # Attach decoded user info to request state for downstream use
        request.state.user = {
            "sub": user.id,
            "email": user.email,
            "app_metadata": user.app_metadata or {},
            "user_metadata": user.user_metadata or {},
        }
        # Role is stored in app_metadata by Supabase custom claims
        request.state.user_role = (
            (user.app_metadata or {}).get("role")
            or (user.user_metadata or {}).get("role")
            or "employee"
        )

        return await call_next(request)
