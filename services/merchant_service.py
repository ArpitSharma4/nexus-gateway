"""
services/merchant_service.py — Business logic for merchant lifecycle.
"""

from sqlalchemy.orm import Session

from models.merchant import Merchant
from utils.security import generate_api_key, hash_api_key


def create_merchant(db: Session, business_name: str) -> dict:
    """
    Register a new merchant.

    Steps:
        1. Generate a secure plain-text API key.
        2. Hash the key (SHA-256) for storage.
        3. Persist the Merchant record to the database.
        4. Return the plain key — this is the ONLY time it is visible.

    Args:
        db:            An active SQLAlchemy database session.
        business_name: The display name of the merchant's business.

    Returns:
        dict: Contains ``merchant_id``, ``name``, and ``api_key``
              (plain-text, shown once).
    """
    plain_key = generate_api_key()
    hashed_key = hash_api_key(plain_key)

    merchant = Merchant(
        name=business_name,
        api_key_hashed=hashed_key,
        webhook_url=None,
    )

    db.add(merchant)
    db.commit()
    db.refresh(merchant)

    return {
        "merchant_id": merchant.id,
        "name": merchant.name,
        "api_key": plain_key,  # Plain key returned once — never stored
    }
