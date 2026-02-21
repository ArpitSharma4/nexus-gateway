"""
api/routes/merchants.py — Merchant-facing endpoints.
"""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.session import get_db
from services.merchant_service import create_merchant

router = APIRouter(prefix="/merchants", tags=["Merchants"])


# ── Request / Response Schemas ─────────────────────────────────────────────────

class MerchantSignupRequest(BaseModel):
    business_name: str = Field(
        ...,
        min_length=2,
        max_length=128,
        examples=["Acme Payments Ltd."],
        description="The display name of your business.",
    )


class MerchantSignupResponse(BaseModel):
    merchant_id: str
    name: str
    api_key: str = Field(
        ...,
        description=(
            "Your plain-text API key. Store this securely — "
            "it will NOT be shown again."
        ),
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post(
    "/signup",
    response_model=MerchantSignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new merchant",
    description=(
        "Creates a new merchant account and returns a one-time plain-text API key. "
        "Store the key immediately — it cannot be recovered after this response."
    ),
)
def signup(
    body: MerchantSignupRequest,
    db: Session = Depends(get_db),
):
    result = create_merchant(db=db, business_name=body.business_name)
    return MerchantSignupResponse(**result)
