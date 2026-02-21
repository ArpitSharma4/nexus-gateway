"""
api/deps.py — Reusable FastAPI dependencies.
"""

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from database.session import get_db
from models.merchant import Merchant
from utils.security import hash_api_key


async def get_current_merchant(
    x_api_key: str = Header(..., description="Your Nexus Gateway API key (nx_...)"),
    db: Session = Depends(get_db),
) -> Merchant:
    """
    FastAPI dependency that authenticates a request via the X-API-KEY header.

    Process:
        1. Hash the incoming key with SHA-256.
        2. Look up the hash in the merchants table.
        3. Raise HTTP 401 if not found (timing-safe: hash comparison only).

    Returns:
        Merchant: The authenticated merchant ORM object.

    Raises:
        HTTPException 401: If the key is missing or invalid.
    """
    hashed = hash_api_key(x_api_key)
    merchant = db.query(Merchant).filter(Merchant.api_key_hashed == hashed).first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    return merchant
