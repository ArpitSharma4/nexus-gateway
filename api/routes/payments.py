"""
api/routes/payments.py — Payment Intent endpoints.
"""

import secrets
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.deps import get_current_merchant
from database.session import get_db
from models.merchant import Merchant
from services.payment_service import create_intent, process_payment

router = APIRouter(prefix="/payments", tags=["Payments"])


# ── Request / Response Schemas ─────────────────────────────────────────────────

class CreatePaymentIntentRequest(BaseModel):
    amount: int = Field(
        ...,
        gt=0,
        examples=[5000],
        description="Amount in the smallest currency unit (e.g. 5000 = ₹50.00 / $50.00).",
    )
    currency: str = Field(
        default="INR",
        min_length=3,
        max_length=3,
        examples=["INR", "USD"],
        description="ISO 4217 currency code.",
    )


class PaymentIntentResponse(BaseModel):
    payment_intent_id: str
    merchant_id: str
    amount: int
    currency: str
    status: str
    idempotency_key: str


class ProcessPaymentRequest(BaseModel):
    card_number: str = Field(
        ...,
        examples=["4111111111111111", "4111111110000"],
        description="Simulated card number. End with 0000 to trigger FAILED (Insufficient Funds).",
    )
    cvv: str = Field(
        ...,
        min_length=3,
        max_length=4,
        examples=["123"],
        description="Simulated CVV (3 or 4 digits).",
    )


class ProcessPaymentResponse(BaseModel):
    payment_intent_id: str
    status: str
    bank_decision: str
    bank_reason: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post(
    "/create",
    summary="Create a Payment Intent",
    description=(
        "Creates a new payment intent for the authenticated merchant. "
        "Supply an **X-Idempotency-Key** header to safely retry without double-charging. "
        "If the same key is sent again, the original intent is returned (HTTP 200) "
        "instead of creating a duplicate (HTTP 201)."
    ),
    responses={
        201: {"description": "New PaymentIntent created."},
        200: {"description": "Existing PaymentIntent returned (idempotent replay)."},
        401: {"description": "Invalid or missing API key."},
    },
)
def create_payment_intent(
    body: CreatePaymentIntentRequest,
    x_idempotency_key: Optional[str] = Header(
        default=None,
        description="Optional client-generated unique key to prevent duplicate charges.",
    ),
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    # Auto-generate an idempotency key if the client didn't supply one
    idem_key = x_idempotency_key or secrets.token_hex(24)

    intent, created = create_intent(
        db=db,
        merchant_id=merchant.id,
        amount=body.amount,
        currency=body.currency,
        idempotency_key=idem_key,
    )

    payload = PaymentIntentResponse(
        payment_intent_id=intent.id,
        merchant_id=intent.merchant_id,
        amount=intent.amount,
        currency=intent.currency,
        status=intent.status,  # Already a plain string (VARCHAR column)
        idempotency_key=intent.idempotency_key,
    )

    http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return JSONResponse(content=payload.model_dump(), status_code=http_status)


@router.post(
    "/{payment_intent_id}/process",
    response_model=ProcessPaymentResponse,
    summary="Process a Payment Intent",
    description=(
        "Submits a PaymentIntent for authorization against the simulated bank. "
        "Drives the lifecycle: **CREATED → PROCESSING → SUCCEEDED | FAILED**. "
        "\n\n**Test scenarios:**\n"
        "- Card ending in `0000` → FAILED (Insufficient Funds)\n"
        "- Amount > 100,000 → FAILED (Fraud Risk)\n"
        "- Any other card + amount ≤ 100,000 → SUCCEEDED"
    ),
    responses={
        200: {"description": "Payment processed (succeeded or failed)."},
        404: {"description": "PaymentIntent not found."},
        409: {"description": "Intent already in a terminal state."},
        401: {"description": "Invalid or missing API key."},
    },
)
def process_payment_intent(
    payment_intent_id: str,
    body: ProcessPaymentRequest,
    background_tasks: BackgroundTasks,
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    intent, bank_resp = process_payment(
        db=db,
        payment_intent_id=payment_intent_id,
        card_number=body.card_number,
        cvv=body.cvv,
        background_tasks=background_tasks,
    )

    return ProcessPaymentResponse(
        payment_intent_id=intent.id,
        status=intent.status,
        bank_decision=bank_resp.decision.value,
        bank_reason=bank_resp.reason,
    )
