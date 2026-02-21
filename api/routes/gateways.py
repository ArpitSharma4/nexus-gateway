"""
api/routes/gateways.py — Gateway settings, routing rules, and health endpoints.
"""

import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.deps import get_current_merchant
from database.session import get_db
from models.gateway import GatewayConfig, GatewayHealth
from models.merchant import Merchant
from models.routing_rule import RoutingRule
from api.utils.encryption import encryption_manager

router = APIRouter(prefix="/gateways", tags=["Gateways"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class GatewayHealthResponse(BaseModel):
    gateway_name: str
    status: str
    latency_ms: float
    message: str


class GatewayConfigRequest(BaseModel):
    gateway_name: str = Field(..., examples=["stripe", "razorpay", "simulator"])
    enabled: bool = True
    api_key: Optional[str] = Field(None, description="API key for this gateway (stored securely)")


class GatewayConfigResponse(BaseModel):
    id: str
    gateway_name: str
    enabled: bool
    has_api_key: bool


class RoutingRuleRequest(BaseModel):
    rule_type: str = Field(..., examples=["priority", "currency", "amount_threshold"])
    gateway_name: str = Field(..., examples=["stripe", "razorpay", "simulator"])
    conditions: Optional[str] = Field(
        None,
        description='JSON string of conditions, e.g. {"currency":"INR"} or {"min_amount":10000}',
        examples=['{"currency":"INR"}', '{"min_amount":10000}'],
    )
    priority: int = Field(0, description="Lower number = higher priority")


class RoutingRuleResponse(BaseModel):
    id: str
    rule_type: str
    gateway_name: str
    conditions: Optional[str]
    priority: int


# ── Health ─────────────────────────────────────────────────────────────────────

@router.get(
    "/health",
    response_model=List[GatewayHealthResponse],
    summary="Get gateway health status",
    description="Returns the latest health-check results for all monitored gateways.",
)
def get_health(db: Session = Depends(get_db)):
    records = db.query(GatewayHealth).all()
    return [
        GatewayHealthResponse(
            gateway_name=r.gateway_name,
            status=r.status,
            latency_ms=r.latency_ms,
            message=r.message or "",
        )
        for r in records
    ]


# ── Gateway Configuration ─────────────────────────────────────────────────────

@router.get(
    "/config",
    response_model=List[GatewayConfigResponse],
    summary="Get merchant gateway configs",
)
def get_configs(
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    configs = (
        db.query(GatewayConfig)
        .filter(GatewayConfig.merchant_id == merchant.id)
        .all()
    )
    print(f"[DEBUG] Fetching gateway configs for merchant {merchant.id}: found {len(configs)}")
    for c in configs:
        print(f"  - {c.gateway_name}: enabled={c.enabled}, has_key={bool(c.api_key_encrypted)}")
    return [
        GatewayConfigResponse(
            id=c.id,
            gateway_name=c.gateway_name,
            enabled=c.enabled,
            has_api_key=bool(c.api_key_encrypted),
        )
        for c in configs
    ]


@router.put(
    "/config",
    response_model=GatewayConfigResponse,
    summary="Create or update a gateway configuration",
)
def upsert_config(
    body: GatewayConfigRequest,
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(GatewayConfig)
        .filter(
            GatewayConfig.merchant_id == merchant.id,
            GatewayConfig.gateway_name == body.gateway_name,
        )
        .first()
    )
    if existing:
        existing.enabled = body.enabled
        if body.api_key is not None:
            existing.api_key_encrypted = encryption_manager.encrypt(body.api_key)
        db.commit()
        db.refresh(existing)
        config = existing
    else:
        config = GatewayConfig(
            merchant_id=merchant.id,
            gateway_name=body.gateway_name,
            enabled=body.enabled,
            api_key_encrypted=encryption_manager.encrypt(body.api_key) if body.api_key else None,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        print(f"[DEBUG] Created NEW gateway config: {body.gateway_name}")

    return GatewayConfigResponse(
        id=config.id,
        gateway_name=config.gateway_name,
        enabled=config.enabled,
        has_api_key=bool(config.api_key_encrypted),
    )


# ── Routing Rules ─────────────────────────────────────────────────────────────

@router.get(
    "/rules",
    response_model=List[RoutingRuleResponse],
    summary="Get merchant routing rules",
)
def get_rules(
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    rules = (
        db.query(RoutingRule)
        .filter(RoutingRule.merchant_id == merchant.id)
        .order_by(RoutingRule.priority.asc())
        .all()
    )
    return [
        RoutingRuleResponse(
            id=r.id,
            rule_type=r.rule_type,
            gateway_name=r.gateway_name,
            conditions=r.conditions,
            priority=r.priority,
        )
        for r in rules
    ]


@router.post(
    "/rules",
    response_model=RoutingRuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a routing rule",
)
def create_rule(
    body: RoutingRuleRequest,
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    # Validate conditions JSON if provided
    if body.conditions:
        try:
            json.loads(body.conditions)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="conditions must be valid JSON.",
            )

    rule = RoutingRule(
        merchant_id=merchant.id,
        rule_type=body.rule_type,
        gateway_name=body.gateway_name,
        conditions=body.conditions,
        priority=body.priority,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    return RoutingRuleResponse(
        id=rule.id,
        rule_type=rule.rule_type,
        gateway_name=rule.gateway_name,
        conditions=rule.conditions,
        priority=rule.priority,
    )


@router.delete(
    "/rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a routing rule",
)
def delete_rule(
    rule_id: str,
    merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    rule = (
        db.query(RoutingRule)
        .filter(RoutingRule.id == rule_id, RoutingRule.merchant_id == merchant.id)
        .first()
    )
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routing rule not found.",
        )
    db.delete(rule)
    db.commit()
