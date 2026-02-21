"""
Root-level entry point for uvicorn.

Usage:
    uvicorn main:app --reload --port 8000

This re-exports the FastAPI `app` from api.main so that both
`uvicorn main:app` and `uvicorn api.main:app` work identically.
"""

from api.main import app  # noqa: F401
