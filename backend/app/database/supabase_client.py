"""
Supabase client singleton.

Usage:
    from app.database.supabase_client import get_supabase
    client = get_supabase()
"""

import os

from supabase import Client, create_client

_supabase_client: Client | None = None


def init_supabase() -> None:
    """
    Initialize the Supabase client on application startup.
    Uses the service-role key for server-side operations that bypass RLS
    when necessary. RLS is still enforced per request via user JWT.
    """
    global _supabase_client

    url: str = os.environ["SUPABASE_URL"]
    key: str = os.environ["SUPABASE_SERVICE_KEY"]

    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment."
        )

    _supabase_client = create_client(url, key)
    print("[OK] Supabase client initialized")


def get_supabase() -> Client:
    """
    Return the initialized Supabase client.
    Raises RuntimeError if init_supabase() has not been called.
    """
    if _supabase_client is None:
        raise RuntimeError(
            "Supabase client not initialized. Call init_supabase() first."
        )
    return _supabase_client
