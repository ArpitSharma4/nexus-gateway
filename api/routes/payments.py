"""
api/routes/payments.py — Payment Intent endpoints.
"""

import secrets
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, BackgroundTasks, Depends, Header, status
from fastapi.responses import JSONResponse, StreamingResponse
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
    gateway_used: Optional[str] = None


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


class TraceEntry(BaseModel):
    timestamp: str
    source: str
    message: str


class ProcessPaymentResponse(BaseModel):
    payment_intent_id: str
    status: str
    gateway_used: str
    bank_decision: str
    bank_reason: str
    trace_log: List[TraceEntry] = []


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get(
    "/",
    summary="List Payment Intents",
    description="Returns filtered and paginated payment intents belonging to the authenticated merchant.",
    tags=["Payments"],
)
def list_payment_intents(
    page: int = 1,
    limit: int = 10,
    sort: str = "none",
    status: str = "all",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    from models.payment import PaymentIntent
    query = db.query(PaymentIntent).filter(PaymentIntent.merchant_id == merchant.id)

    # ── Filtering ──────────────────────────────────────────────────────────
    if status != "all":
        query = query.filter(PaymentIntent.status == status)
    
    if start_date:
        query = query.filter(PaymentIntent.created_at >= start_date)
    if end_date:
        query = query.filter(PaymentIntent.created_at <= end_date)

    # ── Sorting ────────────────────────────────────────────────────────────
    if sort == "highest":
        query = query.order_by(PaymentIntent.amount.desc())
    elif sort == "lowest":
        query = query.order_by(PaymentIntent.amount.asc())
    else:
        query = query.order_by(PaymentIntent.id.desc())

    # ── Total Count (for pagination) ───────────────────────────────────────
    total_filtered = query.count()

    # ── Global Stats (Not filtered by status) ─────────────────────────────
    from sqlalchemy import func
    base_query = db.query(PaymentIntent).filter(PaymentIntent.merchant_id == merchant.id)
    
    stats = {
        "total_all": base_query.count(),
        "total_succeeded": base_query.filter(PaymentIntent.status == "succeeded").count(),
        "total_failed": base_query.filter(PaymentIntent.status == "failed").count(),
        "total_volume": base_query.filter(PaymentIntent.status == "succeeded").with_entities(func.sum(PaymentIntent.amount)).scalar() or 0,
        "gateway_breakdown": {
            row[0]: row[1]
            for row in db.query(PaymentIntent.gateway_used, func.sum(PaymentIntent.amount))
            .filter(PaymentIntent.merchant_id == merchant.id, PaymentIntent.status == "succeeded")
            .group_by(PaymentIntent.gateway_used)
            .all()
        }
    }

    # ── Pagination ─────────────────────────────────────────────────────────
    intents = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total_filtered,
        "page": page,
        "limit": limit,
        "stats": stats,
        "items": [
            {
                "payment_intent_id": i.id,
                "amount": i.amount,
                "currency": i.currency,
                "status": i.status,
                "idempotency_key": i.idempotency_key,
                "gateway_used": i.gateway_used,
            }
            for i in intents
        ]
    }


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
        status=intent.status,
        idempotency_key=intent.idempotency_key,
        gateway_used=intent.gateway_used,
    )

    http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return JSONResponse(content=payload.model_dump(), status_code=http_status)


@router.post(
    "/{payment_intent_id}/process",
    response_model=ProcessPaymentResponse,
    summary="Process a Payment Intent",
    description=(
        "Submits a PaymentIntent for authorization through the Nexus routing engine. "
        "Drives the lifecycle: **CREATED → PROCESSING → SUCCEEDED | FAILED**. "
        "The routing engine selects the best gateway based on merchant rules and "
        "automatically fails over to backup gateways on errors. "
        "A real-time trace log is returned showing every routing decision."
    ),
    responses={
        200: {"description": "Payment processed (succeeded or failed)."},
        404: {"description": "PaymentIntent not found."},
        409: {"description": "Intent already in a terminal state."},
        401: {"description": "Invalid or missing API key."},
    },
)
async def process_payment_intent(
    payment_intent_id: str,
    body: ProcessPaymentRequest,
    background_tasks: BackgroundTasks,
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    intent, result = await process_payment(
        db=db,
        payment_intent_id=payment_intent_id,
        card_number=body.card_number,
        cvv=body.cvv,
        background_tasks=background_tasks,
    )

    return ProcessPaymentResponse(
        payment_intent_id=intent.id,
        status=intent.status,
        gateway_used=result["gateway_used"],
        bank_decision=result["bank_decision"],
        bank_reason=result["bank_reason"],
        trace_log=[TraceEntry(**t) for t in result["trace_log"]],
    )


@router.get(
    "/export/secure",
    summary="Secure Export Payment Intents",
    description="Returns all payment intents in a range for export purposes (no pagination). File is password protected with the API Key.",
)
def export_payment_intents_secure(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: str = "all",
    format: str = "pdf",
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    from models.payment import PaymentIntent
    from services.export_service import generate_secure_pdf, generate_secure_csv_zip
    
    query = db.query(PaymentIntent).filter(PaymentIntent.merchant_id == merchant.id)

    if status != "all":
        query = query.filter(PaymentIntent.status == status)
    if start_date:
        query = query.filter(PaymentIntent.created_at >= start_date)
    if end_date:
        query = query.filter(PaymentIntent.created_at <= end_date)

    intents_objs = query.order_by(PaymentIntent.created_at.desc()).all()
    
    # Convert to dict for the service
    intents = [
        {
            "id": i.id,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "amount": i.amount,
            "currency": i.currency,
            "status": i.status,
            "gateway_used": i.gateway_used,
            "idempotency_key": i.idempotency_key,
        }
        for i in intents_objs
    ]

    date_range = f"{start_date} - {end_date}" if start_date and end_date else "All Time"
    
    # Password is the merchant's API key
    password = merchant.api_key

    if format == "pdf":
        file_buffer = generate_secure_pdf(
            data=intents,
            merchant_name=merchant.name or "Merchant",
            date_range=date_range,
            password=password
        )
        filename = f"nexus_mini_statement_{datetime.now().strftime('%Y%m%d')}.pdf"
        media_type = "application/pdf"
    else:
        file_buffer = generate_secure_csv_zip(
            data=intents,
            password=password
        )
        filename = f"nexus_statement_{datetime.now().strftime('%Y%m%d')}.zip"
        media_type = "application/zip"

    return StreamingResponse(
        file_buffer,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
