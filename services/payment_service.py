"""
services/payment_service.py — Business logic for PaymentIntent lifecycle.

Refactored to use the multi-gateway routing engine and failover system.
"""

import secrets
from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from models.payment import PaymentIntent, PaymentStatus
from services.gateways import get_available_gateways
from services.gateways.base import ChargeStatus
from services.routing_engine import select_gateways
from services.failover import execute_with_failover


def create_intent(
    db: Session,
    merchant_id: str,
    amount: int,
    currency: str,
    idempotency_key: str,
) -> tuple[PaymentIntent, bool]:
    """
    Create a new PaymentIntent, or return an existing one if the
    idempotency_key has been seen before (idempotent replay).

    Returns:
        (PaymentIntent, created): The intent object and whether it was
        newly created (True) or replayed from an existing record (False).
    """
    # ── Idempotency check ──────────────────────────────────────────────────────
    existing = (
        db.query(PaymentIntent)
        .filter(PaymentIntent.idempotency_key == idempotency_key)
        .first()
    )
    if existing:
        return existing, False  # Replay — return as-is

    # ── Generate a payment intent ID with pi_ prefix ───────────────────────────
    pi_id = f"pi_{secrets.token_hex(16)}"

    intent = PaymentIntent(
        id=pi_id,
        merchant_id=merchant_id,
        amount=amount,
        currency=currency.upper(),
        status=PaymentStatus.CREATED.value,  # Store as plain string
        idempotency_key=idempotency_key,
    )

    db.add(intent)
    db.commit()
    db.refresh(intent)

    return intent, True


async def process_payment(
    db: Session,
    payment_intent_id: str,
    card_number: str,
    cvv: str,
    background_tasks: BackgroundTasks | None = None,
) -> tuple[PaymentIntent, dict]:
    """
    Drive a PaymentIntent through the full processing lifecycle with
    multi-gateway routing and automatic failover.

    Steps:
        1. Fetch the intent (404 if not found).
        2. Guard against re-processing a terminal intent (409 Conflict).
        3. Set status → PROCESSING and persist.
        4. Use RoutingEngine to select gateways.
        5. Execute with failover — try primary, fallback on error.
        6. Set status → SUCCEEDED or FAILED.
        7. Store gateway_used and trace_log.
        8. Fire a webhook via BackgroundTasks (if provided and merchant has a URL).

    Returns:
        Tuple of (updated PaymentIntent, result_dict with trace info).
    """
    # ── 1. Fetch ───────────────────────────────────────────────────────────────
    intent = db.query(PaymentIntent).filter(PaymentIntent.id == payment_intent_id).first()
    if not intent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PaymentIntent '{payment_intent_id}' not found.",
        )

    # ── 2. Guard terminal states ───────────────────────────────────────────────
    terminal = {
        PaymentStatus.SUCCEEDED.value,
        PaymentStatus.FAILED.value,
        PaymentStatus.CANCELLED.value,
    }
    if intent.status in terminal:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"PaymentIntent is already in a terminal state: '{intent.status}'.",
        )

    # ── 3. Mark as PROCESSING ─────────────────────────────────────────────────
    intent.status = PaymentStatus.PROCESSING.value
    db.commit()

    # ── 4. Select gateways via routing engine ─────────────────────────────────
    available = get_available_gateways(db=db, merchant_id=intent.merchant_id)
    ordered_gateways = select_gateways(
        db=db,
        merchant_id=intent.merchant_id,
        amount=intent.amount,
        currency=intent.currency,
        available_gateways=available,
    )

    # ── 5. Execute with failover ──────────────────────────────────────────────
    metadata = {"card_number": card_number, "cvv": cvv}
    failover_result = await execute_with_failover(
        gateways=ordered_gateways,
        amount=intent.amount,
        currency=intent.currency,
        idempotency_key=intent.idempotency_key,
        metadata=metadata,
    )

    # ── 6. Apply final status ─────────────────────────────────────────────────
    gw_result = failover_result.gateway_result
    if gw_result and gw_result.status == ChargeStatus.SUCCESS:
        intent.status = PaymentStatus.SUCCEEDED.value
        event_type = "payment.succeeded"
    else:
        intent.status = PaymentStatus.FAILED.value
        event_type = "payment.failed"

    # ── 7. Store routing trace ────────────────────────────────────────────────
    intent.gateway_used = failover_result.gateway_used
    intent.trace_log = failover_result.trace_json

    # ── 8. Persist ────────────────────────────────────────────────────────────
    db.commit()
    db.refresh(intent)

    # ── 9. Fire webhook in background ─────────────────────────────────────────
    if background_tasks is not None:
        from services.webhook_service import trigger_webhook

        webhook_data = {
            "payment_intent_id": intent.id,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
            "gateway_used": intent.gateway_used,
            "bank_decision": gw_result.status.value if gw_result else "error",
            "bank_reason": gw_result.reason if gw_result else "All gateways failed",
        }
        background_tasks.add_task(
            trigger_webhook,
            db=db,
            merchant_id=intent.merchant_id,
            event_type=event_type,
            data=webhook_data,
        )

    result_dict = {
        "status": intent.status,
        "gateway_used": intent.gateway_used,
        "bank_decision": gw_result.status.value if gw_result else "error",
        "bank_reason": gw_result.reason if gw_result else "All gateways failed",
        "trace_log": [t.to_dict() for t in failover_result.trace],
    }

    return intent, result_dict
