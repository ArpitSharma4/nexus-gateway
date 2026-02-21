"""
services/gateways/razorpay_adapter.py — Razorpay payment gateway adapter.

Uses the official `razorpay` Python SDK. Operates in test mode when given
test-mode credentials.
"""

import time
import logging
from typing import List, Optional

from services.gateways.base import (
    BaseGateway,
    ChargeStatus,
    GatewayResult,
    GatewayStatus,
    HealthResult,
)

logger = logging.getLogger(__name__)


class RazorpayAdapter(BaseGateway):
    """Adapter for Razorpay Payments via their Python SDK."""

    def __init__(self, key_id: str, key_secret: str = ""):
        # If key_id contains a colon (e.g., from a single-string storage), split it automatically
        if ":" in key_id and not key_secret:
            parts = key_id.split(":")
            self._key_id = parts[0]
            self._key_secret = parts[1] if len(parts) > 1 else ""
            print(f"[DEBUG] RazorpayAdapter: Auto-split combined key into ID({len(self._key_id)}) and Secret({len(self._key_secret)})")
        else:
            self._key_id = key_id
            self._key_secret = key_secret

        if not self._key_id:
            logger.error("RazorpayAdapter: Initialized with empty Key ID!")
        if not self._key_secret:
            logger.warning("RazorpayAdapter: Initialized with empty Key Secret!")

    @property
    def name(self) -> str:
        return "razorpay"

    @property
    def supported_currencies(self) -> List[str]:
        return ["INR", "USD", "EUR", "GBP", "SGD", "AED"]

    async def charge(
        self,
        amount: int,
        currency: str,
        idempotency_key: str,
        metadata: Optional[dict] = None,
    ) -> GatewayResult:
        try:
            import razorpay
            client = razorpay.Client(auth=(self._key_id, self._key_secret))

            order = client.order.create({
                "amount": amount,
                "currency": currency.upper(),
                "receipt": idempotency_key[:40],
                "notes": {"source": "nexus-gateway"},
            })

            return GatewayResult(
                status=ChargeStatus.SUCCESS,
                gateway_name=self.name,
                transaction_id=order.get("id", ""),
                reason=f"Order created: {order.get('status', 'created')}",
                raw_response=order,
            )

        except Exception as exc:
            logger.warning("Razorpay charge failed: %s", exc)
            return GatewayResult(
                status=ChargeStatus.ERROR,
                gateway_name=self.name,
                reason=str(exc),
            )

    async def health_check(self) -> HealthResult:
        try:
            import razorpay
            client = razorpay.Client(auth=(self._key_id, self._key_secret))

            start = time.perf_counter()
            # Lightweight call — fetch 1 order
            client.order.all({"count": 1})
            latency = (time.perf_counter() - start) * 1000

            return HealthResult(
                gateway_name=self.name,
                status=GatewayStatus.HEALTHY,
                latency_ms=round(latency, 1),
                message="Razorpay API reachable.",
            )
        except Exception as exc:
            return HealthResult(
                gateway_name=self.name,
                status=GatewayStatus.DOWN,
                latency_ms=0,
                message=str(exc),
            )
