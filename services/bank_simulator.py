"""
services/bank_simulator.py — Simulated acquiring bank authorization.

Mirrors the behavior of real payment processors without touching actual
banking infrastructure. Used for development and integration testing.
"""

from dataclasses import dataclass
from enum import Enum


class BankDecision(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


@dataclass
class CardDetails:
    card_number: str
    cvv: str


@dataclass
class BankResponse:
    decision: BankDecision
    reason: str


def authorize_payment(amount: int, card: CardDetails) -> BankResponse:
    """
    Simulate a bank's authorization decision for a payment.

    Rules (in priority order):
        1. Card number ending in ``0000``  → FAILED (Insufficient Funds)
        2. Amount > 100,000 (paise/cents)  → FAILED (Fraud Risk)
        3. All other cases                 → SUCCESS

    Args:
        amount: Payment amount in smallest currency unit.
        card:   Card details provided by the customer.

    Returns:
        BankResponse with a decision and human-readable reason.
    """
    if card.card_number.endswith("0000"):
        return BankResponse(
            decision=BankDecision.FAILED,
            reason="Insufficient funds.",
        )

    if amount > 100_000:
        return BankResponse(
            decision=BankDecision.FAILED,
            reason="Transaction flagged for fraud risk (amount exceeds limit).",
        )

    return BankResponse(
        decision=BankDecision.SUCCESS,
        reason="Authorization approved.",
    )
