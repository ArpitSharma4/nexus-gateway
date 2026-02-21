"""
services/health_monitor.py — Background task that pings each gateway's
health endpoint and updates the gateway_health table in Supabase.
"""

import asyncio
import logging
from datetime import datetime, timezone

from database.session import SessionLocal
from models.gateway import GatewayHealth
from services.gateways import get_available_gateways

logger = logging.getLogger(__name__)

HEALTH_CHECK_INTERVAL_SECONDS = 30


async def health_check_loop():
    """
    Infinite loop that pings all available gateways every 30 seconds
    and upserts results into the gateway_health table.
    """
    # Wait a bit before first check to let the app fully start
    await asyncio.sleep(5)

    while True:
        try:
            gateways = get_available_gateways()
            db = SessionLocal()

            try:
                for gw in gateways.values():
                    try:
                        health = await gw.health_check()

                        # Upsert into gateway_health
                        existing = (
                            db.query(GatewayHealth)
                            .filter(GatewayHealth.gateway_name == gw.name)
                            .first()
                        )

                        if existing:
                            existing.status = health.status.value
                            existing.latency_ms = health.latency_ms
                            existing.message = health.message
                            existing.last_checked_at = datetime.now(timezone.utc)
                        else:
                            record = GatewayHealth(
                                gateway_name=gw.name,
                                status=health.status.value,
                                latency_ms=health.latency_ms,
                                message=health.message,
                                last_checked_at=datetime.now(timezone.utc),
                            )
                            db.add(record)

                        db.commit()
                        logger.debug(
                            "Health check: %s → %s (%0.1fms)",
                            gw.name, health.status.value, health.latency_ms,
                        )

                    except Exception as exc:
                        logger.warning("Health check failed for %s: %s", gw.name, exc)
                        db.rollback()
            finally:
                db.close()

        except Exception as exc:
            logger.error("Health monitor loop error: %s", exc)

        await asyncio.sleep(HEALTH_CHECK_INTERVAL_SECONDS)
