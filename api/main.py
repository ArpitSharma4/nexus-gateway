import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the project root is in the path for Vercel
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
