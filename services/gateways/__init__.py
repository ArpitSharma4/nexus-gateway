"""
services/gateways/__init__.py — Gateway adapter registry.

Reads environment variables to determine which payment gateways are
available and returns instantiated adapter objects.
"""

import os
from typing import Dict, Optional
from sqlalchemy.orm import Session

from services.gateways.base import BaseGateway
from services.gateways.simulator_adapter import SimulatorAdapter
from models.gateway import GatewayConfig
from api.utils.encryption import encryption_manager


def get_available_gateways(db: Optional[Session] = None, merchant_id: Optional[str] = None) -> Dict[str, BaseGateway]:
    """
    Factory that returns a dict of gateway_name → adapter instance.
    
    If db and merchant_id are provided, it loads configurations from the database.
    Otherwise, it checks environment variables (legacy fallback).
    """
    gateways: Dict[str, BaseGateway] = {}

    # 1. Check Database Configs first (if provided)
    if db and merchant_id:
        configs = db.query(GatewayConfig).filter(GatewayConfig.merchant_id == merchant_id).all()
        print(f"[DEBUG] Found {len(configs)} gateway configs in DB for merchant {merchant_id}")
        
        for config in configs:
            if not config.enabled:
                continue
                
            if config.gateway_name == "stripe" and config.api_key_encrypted:
                from services.gateways.stripe_adapter import StripeAdapter
                decrypted_key = encryption_manager.decrypt(config.api_key_encrypted)
                gateways["stripe"] = StripeAdapter(api_key=decrypted_key)
                print(f"[DEBUG] Loaded Stripe from DB (decrypted)")
                
            elif config.gateway_name == "razorpay" and config.api_key_encrypted:
                from services.gateways.razorpay_adapter import RazorpayAdapter
                decrypted_key = encryption_manager.decrypt(config.api_key_encrypted)
                parts = decrypted_key.split(":")
                key_id = parts[0]
                key_secret = parts[1] if len(parts) > 1 else ""
                gateways["razorpay"] = RazorpayAdapter(key_id=key_id, key_secret=key_secret)
                print(f"[DEBUG] Loaded Razorpay from DB (decrypted)")

    # 2. Legacy / Environment Variable Fallback
    if "stripe" not in gateways:
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if stripe_key:
            from services.gateways.stripe_adapter import StripeAdapter
            gateways["stripe"] = StripeAdapter(api_key=stripe_key)
            print(f"[DEBUG] Loaded Stripe from ENV")

    if "razorpay" not in gateways:
        rz_key_id = os.getenv("RAZORPAY_KEY_ID")
        rz_key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        if rz_key_id and rz_key_secret:
            from services.gateways.razorpay_adapter import RazorpayAdapter
            gateways["razorpay"] = RazorpayAdapter(key_id=rz_key_id, key_secret=rz_key_secret)
            print(f"[DEBUG] Loaded Razorpay from ENV")

    # 3. Simulator — always available
    gateways["simulator"] = SimulatorAdapter()
    print(f"[DEBUG] Loaded Simulator (Always Active)")

    return gateways
