import sys
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Robust Path Handling for Vercel ──────────────────────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

if project_root not in sys.path:
    sys.path.insert(0, project_root)

from api.routes import merchants, payments, gateways


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on startup, clean up on shutdown."""
    from services.health_monitor import health_check_loop
    task = asyncio.create_task(health_check_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# ── App Instance ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Nexus Layer",
    description=(
        "A real-time payment orchestration engine. "
        "Multi-gateway routing (Stripe, Razorpay, Simulator), "
        "automatic failover, and real-time health monitoring."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
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

app.include_router(merchants.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(gateways.router, prefix="/api")

# ── Core Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["System"], summary="Health check")
def health_check():
    """Returns a simple liveness signal — useful for uptime monitors."""
    return {"status": "ok", "service": "nexus-gateway", "version": "2.0.0"}
