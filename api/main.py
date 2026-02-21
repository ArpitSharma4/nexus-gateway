import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Robust Path Handling for Vercel ──────────────────────────────────────────
import os
import sys

# Get the absolute path of the current file's directory (api/)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Get the project root (one level up from api/)
project_root = os.path.dirname(current_dir)

# Ensure project root is at the front of sys.path
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from api.routes import merchants, payments

# ── App Instance ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Nexus Gateway",
    description=(
        "A mini Stripe-style payment gateway. "
        "Provides merchant onboarding, payment intents, and webhook delivery."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(merchants.router)
app.include_router(payments.router)

# ── Core Endpoints ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"], summary="Health check")
def health_check():
    """Returns a simple liveness signal — useful for uptime monitors."""
    return {"status": "ok", "service": "nexus-gateway"}
