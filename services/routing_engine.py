"""
services/routing_engine.py — The "brain" that selects gateways for a payment.

Reads the merchant's RoutingRules from the database, evaluates them against
the incoming payment parameters, and returns an ordered list of gateways to
try (primary + fallbacks).
"""

import json
import logging
from typing import Dict, List

from sqlalchemy.orm import Session

from models.routing_rule import RoutingRule
from services.gateways.base import BaseGateway

logger = logging.getLogger(__name__)


def select_gateways(
    db: Session,
    merchant_id: str,
    amount: int,
    currency: str,
    available_gateways: Dict[str, BaseGateway],
) -> List[BaseGateway]:
    """
    Evaluate the merchant's routing rules and return an ordered list of
    gateways to attempt, from highest priority to lowest.

    Evaluation logic:
        1. Fetch all rules for this merchant, ordered by priority ASC.
        2. For each rule, check if the payment matches the conditions.
        3. If a matching rule's gateway is available, put it first.
        4. All remaining available gateways are appended as fallbacks.
        5. If no rules exist, return gateways in default order (simulator last).

    Args:
        db:                  Active SQLAlchemy session.
        merchant_id:         ID of the authenticated merchant.
        amount:              Payment amount in smallest currency unit.
        currency:            ISO 4217 currency code.
        available_gateways:  Dict of gateway_name → BaseGateway instance.

    Returns:
        Ordered list of BaseGateway instances to try.
    """
    rules = (
        db.query(RoutingRule)
        .filter(RoutingRule.merchant_id == merchant_id)
        .order_by(RoutingRule.priority.asc())
        .all()
    )

    # ── Chaos Engineering: Filter out "Killed" nodes ──────────────────────────
    from models.gateway import GatewayHealth
    outages = {h.gateway_name for h in db.query(GatewayHealth).filter(GatewayHealth.is_simulated_outage == True).all()}
    
    filtered_available = {k: v for k, v in available_gateways.items() if k not in outages}

    ordered: List[str] = []
    used: set = set()

    for rule in rules:
        if rule.gateway_name not in filtered_available:
            continue
        if rule.gateway_name in used:
            continue

        if _matches(rule, amount, currency):
            ordered.append(rule.gateway_name)
            used.add(rule.gateway_name)
            logger.info(
                "Rule match: type=%s gateway=%s for %s %s",
                rule.rule_type, rule.gateway_name, amount, currency,
            )

    # Append remaining gateways (simulator last as the ultimate fallback)
    for gw_name in sorted(filtered_available.keys(), key=lambda n: (n == "simulator", n)):
        if gw_name not in used:
            ordered.append(gw_name)

    return [filtered_available[n] for n in ordered]


def _matches(rule: RoutingRule, amount: int, currency: str) -> bool:
    """Check if a routing rule matches the given payment parameters."""
    if rule.rule_type == "priority":
        # Priority rules always match — they just set ordering
        return True

    try:
        conditions = json.loads(rule.conditions) if rule.conditions else {}
    except (json.JSONDecodeError, TypeError):
        return False

    if rule.rule_type == "currency":
        target_currency = conditions.get("currency", "").upper()
        return currency.upper() == target_currency

    if rule.rule_type == "amount_threshold":
        min_amount = conditions.get("min_amount", 0)
        return amount >= min_amount

    return False
