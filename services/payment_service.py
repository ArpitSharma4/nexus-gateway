"""
services/payment_service.py — Business logic for PaymentIntent lifecycle.
"""

import secrets
from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from models.payment import PaymentIntent, PaymentStatus
from services.bank_simulator import authorize_payment, BankDecision, BankResponse, CardDetails


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


def process_payment(
    db: Session,
    payment_intent_id: str,
    card_number: str,
    cvv: str,
    background_tasks: BackgroundTasks | None = None,
) -> tuple[PaymentIntent, BankResponse]:
    """
    Drive a PaymentIntent through the full processing lifecycle.

    Steps:
        1. Fetch the intent (404 if not found).
        2. Guard against re-processing a terminal intent (409 Conflict).
        3. Set status → PROCESSING and persist.
        4. Call the bank simulator.
        5. Set status → SUCCEEDED or FAILED.
        6. Persist final state.
        7. Fire a webhook via BackgroundTasks (if provided and merchant has a URL).

    Returns:
        Tuple of (updated PaymentIntent, BankResponse).

    Raises:
        HTTPException 404: Intent not found.
        HTTPException 409: Intent already in a terminal state.
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

    # ── 4. Call the bank simulator ────────────────────────────────────────────
    card = CardDetails(card_number=card_number, cvv=cvv)
    bank_response = authorize_payment(amount=intent.amount, card=card)

    # ── 5. Apply final status ─────────────────────────────────────────────────
    if bank_response.decision == BankDecision.SUCCESS:
        intent.status = PaymentStatus.SUCCEEDED.value
        event_type = "payment.succeeded"
    else:
        intent.status = PaymentStatus.FAILED.value
        event_type = "payment.failed"

    # ── 6. Persist ────────────────────────────────────────────────────────────
    db.commit()
    db.refresh(intent)

    # ── 7. Fire webhook in background ─────────────────────────────────────────
    if background_tasks is not None:
        from services.webhook_service import trigger_webhook  # avoid circular import

        webhook_data = {
            "payment_intent_id": intent.id,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
            "bank_decision": bank_response.decision.value,
            "bank_reason": bank_response.reason,
        }
        background_tasks.add_task(
            trigger_webhook,
            db=db,
            merchant_id=intent.merchant_id,
            event_type=event_type,
            data=webhook_data,
        )

    return intent, bank_response
