"""
api/routes/merchants.py — Merchant-facing endpoints.
"""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.session import get_db
from models.merchant import Merchant
from services.merchant_service import create_merchant
from utils.security import hash_api_key

router = APIRouter(prefix="/merchants", tags=["Merchants"])


# ── Request / Response Schemas ─────────────────────────────────────────────────

class MerchantSignupRequest(BaseModel):
    business_name: str = Field(
        ...,
        min_length=5,
        max_length=128,
        examples=["Acme Payments Ltd."],
        description="The display name of your business (min 5 chars, at least one uppercase letter).",
    )

    @field_validator("business_name")
    @classmethod
    def validate_business_name(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Business name must contain at least one uppercase letter.")
        alpha_count = sum(c.isalpha() for c in v)
        if alpha_count < 5:
            raise ValueError("Business name must contain at least 5 alphabetic characters.")
        return v


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


class MerchantLoginRequest(BaseModel):
    api_key: str = Field(
        ...,
        description="The plain-text API key issued at signup.",
    )


class MerchantLoginResponse(BaseModel):
    merchant_id: str
    name: str


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
    # Case-insensitive duplicate check
    existing = db.query(Merchant).filter(
        func.lower(Merchant.name) == body.business_name.lower()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A merchant with this business name already exists. Please use the Login tab with your API key.",
        )

    result = create_merchant(db=db, business_name=body.business_name)
    return MerchantSignupResponse(**result)


@router.post(
    "/login",
    response_model=MerchantLoginResponse,
    summary="Login with an existing API key",
    description="Validates an API key and returns the associated merchant info.",
)
def login(
    body: MerchantLoginRequest,
    db: Session = Depends(get_db),
):
    hashed = hash_api_key(body.api_key)
    merchant = db.query(Merchant).filter(Merchant.api_key_hashed == hashed).first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
        )

    return MerchantLoginResponse(merchant_id=merchant.id, name=merchant.name)
