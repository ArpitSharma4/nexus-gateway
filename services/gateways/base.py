"""
services/gateways/base.py — Abstract base class for all payment gateway adapters.

Every gateway (Stripe, Razorpay, Simulator, etc.) must implement this
interface so the routing engine can treat them uniformly.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class GatewayStatus(str, Enum):
    """Health-check result for a gateway."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"


class ChargeStatus(str, Enum):
    """Outcome of a charge attempt."""
    SUCCESS = "success"
    FAILED = "failed"
    ERROR = "error"  # Network / unexpected error — eligible for failover


@dataclass
class GatewayResult:
    """Standardised result returned by every gateway adapter."""
    status: ChargeStatus
    gateway_name: str
    transaction_id: Optional[str] = None
    reason: str = ""
    raw_response: Optional[dict] = None


@dataclass
class HealthResult:
    """Result of a gateway health-check ping."""
    gateway_name: str
    status: GatewayStatus
    latency_ms: float = 0.0
    message: str = ""


class BaseGateway(ABC):
    """
    Abstract payment gateway adapter.

    Subclasses must implement:
        - charge()       — create a payment / capture funds
        - health_check() — lightweight ping to verify availability
        - name           — human-readable identifier
        - supported_currencies — list of ISO 4217 codes
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique lowercase identifier, e.g. 'stripe', 'razorpay', 'simulator'."""
        ...

    @property
    @abstractmethod
    def supported_currencies(self) -> List[str]:
        """ISO 4217 currency codes this gateway can process."""
        ...

    @abstractmethod
    async def charge(
        self,
        amount: int,
        currency: str,
        idempotency_key: str,
        metadata: Optional[dict] = None,
    ) -> GatewayResult:
        """
        Attempt to charge the given amount.

        Args:
            amount:          Amount in smallest currency unit (paise / cents).
            currency:        ISO 4217 code, e.g. "INR", "USD".
            idempotency_key: Unique key to prevent duplicate charges.
            metadata:        Optional dict of extra info (card details, etc.).

        Returns:
            GatewayResult with status, transaction_id, and reason.
        """
        ...

    @abstractmethod
    async def health_check(self) -> HealthResult:
        """
        Lightweight availability check. Should complete in < 5 seconds.

        Returns:
            HealthResult with status, latency, and optional error message.
        """
        ...
