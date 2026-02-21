"""
services/gateways/stripe_adapter.py — Stripe payment gateway adapter.

Uses the official `stripe` Python SDK. Operates in test mode when given
a test-mode secret key (sk_test_...).
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


class StripeAdapter(BaseGateway):
    """Adapter for Stripe Payments via their Python SDK."""

    def __init__(self, api_key: str):
        self._api_key = api_key

    @property
    def name(self) -> str:
        return "stripe"

    @property
    def supported_currencies(self) -> List[str]:
        return ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "SGD", "JPY"]

    async def charge(
        self,
        amount: int,
        currency: str,
        idempotency_key: str,
        metadata: Optional[dict] = None,
    ) -> GatewayResult:
        try:
            import stripe
            stripe.api_key = self._api_key

            # Create a PaymentIntent (test mode — no real card required)
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency.lower(),
                payment_method_types=["card"],
                idempotency_key=idempotency_key,
                metadata={"source": "nexus-gateway"},
                api_key=self._api_key
            )
            
            # Explicitly ensures the header is correctly formed as "Bearer key" 
            # by the underlying library while being thread-safe (non-global key).

            return GatewayResult(
                status=ChargeStatus.SUCCESS,
                gateway_name=self.name,
                transaction_id=intent.id,
                reason=f"PaymentIntent created: {intent.status}",
                raw_response={"id": intent.id, "status": intent.status},
            )

        except Exception as exc:
            logger.warning("Stripe charge failed: %s", exc)
            return GatewayResult(
                status=ChargeStatus.ERROR,
                gateway_name=self.name,
                reason=str(exc),
            )

    async def health_check(self) -> HealthResult:
        try:
            import stripe
            stripe.api_key = self._api_key

            start = time.perf_counter()
            # Lightweight call — list 1 balance transaction
            stripe.Balance.retrieve(api_key=self._api_key)
            latency = (time.perf_counter() - start) * 1000

            return HealthResult(
                gateway_name=self.name,
                status=GatewayStatus.HEALTHY,
                latency_ms=round(latency, 1),
                message="Stripe API reachable.",
            )
        except Exception as exc:
            return HealthResult(
                gateway_name=self.name,
                status=GatewayStatus.DOWN,
                latency_ms=0,
                message=str(exc),
            )
