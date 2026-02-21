"""
services/gateways/simulator_adapter.py — Wraps the existing bank_simulator
logic into a BaseGateway-compatible adapter.

This is the default gateway that works without any API keys.
"""

import asyncio
import time
import random
from typing import List, Optional

from services.gateways.base import (
    BaseGateway,
    ChargeStatus,
    GatewayResult,
    GatewayStatus,
    HealthResult,
)
from services.bank_simulator import authorize_payment, BankDecision, CardDetails


class SimulatorAdapter(BaseGateway):
    """In-memory bank simulator — zero external dependencies."""

    @property
    def name(self) -> str:
        return "simulator"

    @property
    def supported_currencies(self) -> List[str]:
        return ["INR", "USD", "EUR", "GBP"]  # accepts everything

    async def charge(
        self,
        amount: int,
        currency: str,
        idempotency_key: str,
        metadata: Optional[dict] = None,
    ) -> GatewayResult:
        metadata = metadata or {}
        card_number = metadata.get("card_number", "4111111111111111")
        cvv = metadata.get("cvv", "123")

        # Simulate network latency (50–200 ms)
        await asyncio.sleep(random.uniform(0.05, 0.2))

        card = CardDetails(card_number=card_number, cvv=cvv)
        bank_resp = authorize_payment(amount=amount, card=card)

        if bank_resp.decision == BankDecision.SUCCESS:
            return GatewayResult(
                status=ChargeStatus.SUCCESS,
                gateway_name=self.name,
                transaction_id=f"sim_{idempotency_key[:16]}",
                reason=bank_resp.reason,
            )
        else:
            return GatewayResult(
                status=ChargeStatus.FAILED,
                gateway_name=self.name,
                reason=bank_resp.reason,
            )

    async def health_check(self) -> HealthResult:
        start = time.perf_counter()
        await asyncio.sleep(0.01)  # trivial latency
        latency = (time.perf_counter() - start) * 1000
        return HealthResult(
            gateway_name=self.name,
            status=GatewayStatus.HEALTHY,
            latency_ms=round(latency, 1),
            message="Simulator is always healthy.",
        )
