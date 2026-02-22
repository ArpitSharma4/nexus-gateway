"""
models/gateway.py — ORM models for gateway configuration and health tracking.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, Float, DateTime, Text
from database.session import Base


class GatewayConfig(Base):
    """
    Stores per-merchant gateway settings — API keys, enabled state.
    Each merchant can enable/disable gateways independently.
    """
    __tablename__ = "gateway_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String, nullable=False, index=True)
    gateway_name = Column(String(50), nullable=False)  # stripe, razorpay, simulator
    enabled = Column(Boolean, default=True)
    api_key_encrypted = Column(Text, nullable=True)     # encrypted API key (optional)
    extra_config = Column(Text, nullable=True)           # JSON blob for extra settings
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class GatewayHealth(Base):
    """
    Tracks the latest health-check result for each gateway.
    Updated by the background health_monitor task.
    """
    __tablename__ = "gateway_health"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    gateway_name = Column(String(50), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default="healthy")  # healthy, degraded, down
    is_simulated_outage = Column(Boolean, default=False)             # Chaos Control trigger
    latency_ms = Column(Float, nullable=False, default=0.0)
    message = Column(Text, nullable=True)
    last_checked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
