"""
HRMS Platform - FastAPI Application Entry Point
Phase 1: Foundation Setup
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.middleware.auth_middleware import SupabaseJWTMiddleware
from app.middleware.rbac_middleware import RBACMiddleware
from app.database.supabase_client import init_supabase

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown logic
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup; clean up on shutdown."""
    print("[STARTUP] HRMS API starting up...")
    init_supabase()
    yield
    print("[SHUTDOWN] HRMS API shutting down...")


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="HRMS Platform API",
    description="AI-powered Human Resource Management System",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Custom middleware
# ---------------------------------------------------------------------------
# NOTE: Starlette applies middleware in LIFO order (last added = outermost).
# CORSMiddleware MUST be outermost so it wraps every response — including
# 401/403 error responses from inner middleware. Without this, those error
# responses lack CORS headers, the browser blocks them, and Axios reports
# a generic "Network Error" instead of the real HTTP status.
# ---------------------------------------------------------------------------

# RBAC must run after JWT validation so role is already on the request state
app.add_middleware(RBACMiddleware)
app.add_middleware(SupabaseJWTMiddleware)

# CORSMiddleware last → outermost → wraps all responses with Access-Control headers
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers  (import and include as features are built)
# ---------------------------------------------------------------------------

# ── Phase 1: Auth router (active) ──────────────────────────────────────────
from app.routers import auth
app.include_router(auth.router, prefix="/api/v1")

# ── Phase 2: Recruitment / AI Screening router (active) ─────────────────────
from app.routers import recruitment
app.include_router(recruitment.router, prefix="/api/v1")

# ── Phase 3: Dashboard router (active) ────────────────────────────────────────
from app.routers import dashboard
app.include_router(dashboard.router, prefix="/api/v1")

# ── Phase 4: Employees, Candidates, Departments (active) ────────────────────
from app.routers import candidates
app.include_router(candidates.router, prefix="/api/v1")

from app.routers import employees
app.include_router(employees.router, prefix="/api/v1")

from app.routers import departments
app.include_router(departments.router, prefix="/api/v1")

# ── Phase 5: Chatbot (active) ────────────────────────────────────────────────
from app.routers import chatbot
app.include_router(chatbot.router, prefix="/api/v1")

# ── Interviews: Generate Google Meet links (HR Recruiter only) ──────────────
from app.routers import interviews
app.include_router(interviews.router, prefix="/api/v1")

# ── Phase 6: Attendance, Payroll, Performance (active) ──────────────────────
from app.routers import attendance, payroll, performance
app.include_router(attendance.router, prefix="/api/v1")
app.include_router(payroll.router, prefix="/api/v1")
app.include_router(performance.router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint used by load balancers and monitoring tools.
    Returns 200 OK with basic service status information.
    """
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "HRMS Platform API",
            "version": "0.1.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
        },
    )


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint — redirects consumers to the API docs."""
    return {
        "message": "HRMS Platform API",
        "docs": "/docs",
        "health": "/health",
    }
