"""
mock_merchant_listener.py — Simulated merchant webhook receiver.

Runs on port 8001 and logs every incoming webhook payload and its
HMAC-SHA256 signature so you can verify the signing logic end-to-end
without needing a real merchant server.

Usage:
    python mock_merchant_listener.py

Then update a merchant's webhook_url to http://localhost:8001/webhook
via Supabase or a future PATCH endpoint.
"""

import hashlib
import hmac
import json
import os

import uvicorn
from fastapi import FastAPI, Header, Request
from dotenv import load_dotenv

load_dotenv()

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "nexus_whsec_changeme_in_production")

app = FastAPI(title="Mock Merchant Webhook Listener", docs_url=None, redoc_url=None)


@app.post("/webhook")
async def receive_webhook(
    request: Request,
    x_nexus_signature: str = Header(...),
    x_nexus_event: str = Header(...),
):
    raw_body = await request.body()
    payload_str = raw_body.decode()

    # ── Verify signature ───────────────────────────────────────────────────────
    expected_digest = hmac.new(
        key=WEBHOOK_SECRET.encode(),
        msg=payload_str.encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()
    expected_signature = f"sha256={expected_digest}"

    verified = hmac.compare_digest(expected_signature, x_nexus_signature)

    # ── Pretty-print the event ─────────────────────────────────────────────────
    separator = "─" * 60
    print(f"\n{separator}")
    print(f"  EVENT RECEIVED: {x_nexus_event}")
    print(separator)
    print(f"  Signature:  {x_nexus_signature}")
    print(f"  Verified:   {'✅ VALID' if verified else '❌ INVALID'}")
    print(f"  Payload:\n{json.dumps(json.loads(payload_str), indent=4)}")
    print(separator)

    return {"received": True, "event": x_nexus_event, "signature_valid": verified}


if __name__ == "__main__":
    print("🎧  Mock Merchant Listener starting on http://localhost:8001")
    print("    Set webhook_url to: http://localhost:8001/webhook")
    uvicorn.run(app, host="0.0.0.0", port=8001)
