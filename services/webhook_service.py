"""
services/webhook_service.py — Async webhook delivery with HMAC signing.

Fires a signed HTTP POST to a merchant's registered webhook_url whenever
a payment event occurs. Failures are logged but never propagated to the
caller — webhooks are best-effort and run in the background.
"""

import json
import logging
import os
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from models.merchant import Merchant
from utils.security import sign_webhook_payload

logger = logging.getLogger(__name__)

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "nexus_whsec_changeme_in_production")
WEBHOOK_TIMEOUT_SECONDS = 10


async def trigger_webhook(
    db: Session,
    merchant_id: str,
    event_type: str,
    data: dict,
) -> None:
    """
    Fetch the merchant's webhook_url and POST a signed event payload to it.

    The request includes:
        - ``X-Nexus-Signature``:  HMAC-SHA256 of the raw JSON body.
        - ``X-Nexus-Event``:      Event type string, e.g. ``payment.succeeded``.
        - ``Content-Type``:       ``application/json``.

    Failures (network errors, non-2xx responses) are logged as warnings
    and swallowed — the background task must never crash the main request.

    Args:
        db:          Active SQLAlchemy session (used to look up the merchant).
        merchant_id: ID of the merchant who owns this event.
        event_type:  Dot-notation event name, e.g. ``payment.succeeded``.
        data:        Arbitrary dict that becomes the ``data`` field of the payload.
    """
    # ── Fetch merchant & validate webhook URL ─────────────────────────────────
    merchant: Merchant | None = db.query(Merchant).filter(Merchant.id == merchant_id).first()

    if not merchant or not merchant.webhook_url:
        logger.info(
            "Webhook skipped for merchant %s — no webhook_url registered.",
            merchant_id,
        )
        return

    # ── Build the payload ──────────────────────────────────────────────────────
    payload_dict = {
        "type": event_type,
        "data": data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    payload_json = json.dumps(payload_dict, separators=(",", ":"))  # Compact JSON

    # ── Sign the payload ───────────────────────────────────────────────────────
    signature = sign_webhook_payload(payload=payload_json, secret=WEBHOOK_SECRET)

    # ── Deliver via httpx ──────────────────────────────────────────────────────
    headers = {
        "Content-Type": "application/json",
        "X-Nexus-Signature": signature,
        "X-Nexus-Event": event_type,
    }

    try:
        async with httpx.AsyncClient(timeout=WEBHOOK_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url=merchant.webhook_url,
                content=payload_json,
                headers=headers,
            )
            response.raise_for_status()
            logger.info(
                "Webhook delivered to %s for event '%s' — HTTP %s.",
                merchant.webhook_url,
                event_type,
                response.status_code,
            )
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "Webhook to %s returned HTTP %s for event '%s'.",
            merchant.webhook_url,
            exc.response.status_code,
            event_type,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Webhook delivery failed for merchant %s, event '%s': %s",
            merchant_id,
            event_type,
            exc,
        )
