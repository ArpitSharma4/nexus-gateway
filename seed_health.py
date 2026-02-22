from database.session import SessionLocal
from models.gateway import GatewayHealth
db = SessionLocal()
try:
    gateways = ['stripe', 'razorpay']
    for gw in gateways:
        existing = db.query(GatewayHealth).filter(GatewayHealth.gateway_name == gw).first()
        if not existing:
            db.add(GatewayHealth(gateway_name=gw, status='healthy', latency_ms=0.0))
            print(f'Added {gw}')
        else:
            print(f'{gw} already exists')
    db.commit()
except Exception as e:
    print(f'Error: {e}')
    db.rollback()
finally:
    db.close()
