"""
models/routing_rule.py — ORM model for merchant routing policies.

Each rule defines a condition under which a specific gateway should be
selected. Rules are evaluated in priority order by the RoutingEngine.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Text, DateTime
from database.session import Base


class RoutingRule(Base):
    """
    A single routing rule for a merchant.

    rule_type choices:
        - "priority"          — static priority ordering
        - "currency"          — route by currency (conditions = {"currency": "INR"})
        - "amount_threshold"  — route by amount   (conditions = {"min_amount": 10000})

    The routing engine evaluates rules in ascending `priority` order.
    """
    __tablename__ = "routing_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String, nullable=False, index=True)
    rule_type = Column(String(30), nullable=False)        # priority, currency, amount_threshold
    gateway_name = Column(String(50), nullable=False)     # target gateway
    conditions = Column(Text, nullable=True)              # JSON blob of match conditions
    priority = Column(Integer, nullable=False, default=0) # lower = higher priority
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
