"""
services/failover.py — Retry loop with automatic gateway failover.

Wraps gateway charge calls: if Gateway A fails with an ERROR (5xx, timeout),
immediately attempts Gateway B using the same idempotency_key. Produces a
timestamped trace log of every step for observability.
"""

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from services.gateways.base import BaseGateway, ChargeStatus, GatewayResult

logger = logging.getLogger(__name__)


class TraceEntry:
    """Single timestamped log entry in the routing trace."""

    def __init__(self, source: str, message: str):
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.source = source
        self.message = message

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "source": self.source,
            "message": self.message,
        }


class FailoverResult:
    """Combined result of the failover attempt with full trace log."""

    def __init__(self):
        self.gateway_result: Optional[GatewayResult] = None
        self.trace: List[TraceEntry] = []
        self.gateway_used: str = ""

    def add_trace(self, source: str, message: str):
        self.trace.append(TraceEntry(source=source, message=message))

    @property
    def trace_json(self) -> str:
        return json.dumps([t.to_dict() for t in self.trace])


async def execute_with_failover(
    gateways: List[BaseGateway],
    amount: int,
    currency: str,
    idempotency_key: str,
    metadata: Optional[dict] = None,
) -> FailoverResult:
    """
    Try each gateway in order. If one returns ChargeStatus.ERROR
    (network failure, 5xx, timeout), move to the next gateway.

    ChargeStatus.FAILED (legitimate decline) is NOT retried — it means
    the payment was genuinely rejected.

    Args:
        gateways:        Ordered list of gateways to try.
        amount:          Amount in smallest currency unit.
        currency:        ISO 4217 code.
        idempotency_key: Shared key across all retry attempts.
        metadata:        Extra info (card details, etc.).

    Returns:
        FailoverResult with the final GatewayResult and full trace log.
    """
    result = FailoverResult()
    result.add_trace("nexus", f"Request received for {amount / 100:.2f} {currency}.")
    result.add_trace("engine", f"Evaluating {len(gateways)} gateway(s): {[g.name for g in gateways]}")

    for i, gateway in enumerate(gateways):
        result.add_trace("engine", f"Routing to {gateway.name.capitalize()} ({_gateway_reason(gateway, currency)}).")

        try:
            gw_result = await gateway.charge(
                amount=amount,
                currency=currency,
                idempotency_key=idempotency_key,
                metadata=metadata,
            )
        except Exception as exc:
            logger.warning("Gateway %s raised exception: %s", gateway.name, exc)
            gw_result = GatewayResult(
                status=ChargeStatus.ERROR,
                gateway_name=gateway.name,
                reason=str(exc),
            )

        if gw_result.status == ChargeStatus.SUCCESS:
            result.gateway_result = gw_result
            result.gateway_used = gateway.name
            result.add_trace("nexus", f"Payment Succeeded via {gateway.name.capitalize()}.")
            return result

        if gw_result.status == ChargeStatus.FAILED:
            # Legitimate decline — don't retry
            result.gateway_result = gw_result
            result.gateway_used = gateway.name
            result.add_trace("nexus", f"Payment Declined by {gateway.name.capitalize()}: {gw_result.reason}")
            return result

        # ERROR — eligible for failover
        result.add_trace("engine", f"Error from {gateway.name.capitalize()}: {gw_result.reason}")

        if i < len(gateways) - 1:
            next_gw = gateways[i + 1]
            result.add_trace("engine", f"Switching to {next_gw.name.capitalize()} backup...")
        else:
            result.add_trace("engine", "No more gateways available for failover.")

    # All gateways exhausted or none provided
    if not result.gateway_result:
        # This happens if gateways list was empty or all errored with exceptions
        result.gateway_result = GatewayResult(
            status=ChargeStatus.ERROR,
            gateway_name="nexus",
            reason="No gateways found or all gateways failed to initialize.",
        )

    result.gateway_used = gateways[-1].name if gateways else "none"
    result.add_trace("nexus", "All gateways exhausted. Payment failed.")
    return result


def _gateway_reason(gateway: BaseGateway, currency: str) -> str:
    """Generate a human-readable reason for choosing this gateway."""
    if currency.upper() in ("INR",) and gateway.name == "razorpay":
        return "Optimized for INR"
    if currency.upper() in ("USD", "EUR", "GBP") and gateway.name == "stripe":
        return "Optimized for international"
    if gateway.name == "simulator":
        return "Built-in simulator"
    return "Policy match"
