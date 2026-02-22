import uuid
import enum
from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.sql import func
from database.session import Base


class PaymentStatus(str, enum.Enum):
    """Lifecycle states for a PaymentIntent."""
    CREATED = "created"          # Initial state — intent recorded
    PENDING = "pending"          # Awaiting bank processing
    PROCESSING = "processing"    # In-flight with the bank
    SUCCEEDED = "succeeded"      # Payment confirmed
    FAILED = "failed"            # Payment declined / error
    CANCELLED = "cancelled"      # Cancelled before processing


class PaymentIntent(Base):
    """
    Represents a payment attempt initiated by a merchant.
    Uses an idempotency_key to safely handle duplicate requests.
    Status is stored as VARCHAR to avoid Postgres enum migration complexity.
    """
    __tablename__ = "payment_intents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    merchant_id = Column(String, nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # Smallest currency unit (paise/cents)
    currency = Column(String(3), nullable=False, default="INR")
    status = Column(String(20), nullable=False, default=PaymentStatus.CREATED.value)
    idempotency_key = Column(String, nullable=False, unique=True, index=True)
    gateway_used = Column(String(50), nullable=True)   # Which gateway processed this payment
    trace_log = Column(Text, nullable=True)            # JSON trace of routing decisions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
