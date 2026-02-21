"""
utils/security.py — API key generation, hashing, and webhook signing utilities.

Keys use a hex-encoded random token prefixed with 'nx_' for easy
identification. Hashing uses SHA-256 so the plaintext key is never
stored in the database. Webhook signing uses HMAC-SHA256 to let
merchants verify payload authenticity.
"""

import hashlib
import hmac
import secrets


_KEY_PREFIX = "nx_"
_KEY_BYTES = 32  # 256 bits of entropy → 64 hex chars


def generate_api_key() -> str:
    """
    Generate a cryptographically secure random API key.

    Returns:
        str: A key in the format ``nx_<64 hex characters>``.
    """
    token = secrets.token_hex(_KEY_BYTES)
    return f"{_KEY_PREFIX}{token}"


def hash_api_key(plain_key: str) -> str:
    """
    Hash an API key using SHA-256 for safe database storage.

    Args:
        plain_key: The raw API key (including the nx_ prefix).

    Returns:
        str: A 64-character lowercase hex digest.
    """
    return hashlib.sha256(plain_key.encode()).hexdigest()


def sign_webhook_payload(payload: str, secret: str) -> str:
    """
    Create an HMAC-SHA256 signature for a webhook payload.

    Merchants use this signature (sent in the ``X-Nexus-Signature`` header)
    to verify that the request genuinely came from Nexus Layer and that
    the body has not been tampered with in transit.

    Args:
        payload: The raw JSON string of the webhook body.
        secret:  The shared WEBHOOK_SECRET from the environment.

    Returns:
        str: A lowercase hex HMAC-SHA256 digest, prefixed with ``sha256=``
             for easy identification (matches GitHub/Stripe conventions).
    """
    digest = hmac.new(
        key=secret.encode(),
        msg=payload.encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return f"sha256={digest}"
