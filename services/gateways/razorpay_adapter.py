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

    def __init__(self, key_id: str, key_secret: str):
        self._key_id = key_id
        self._key_secret = key_secret

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
