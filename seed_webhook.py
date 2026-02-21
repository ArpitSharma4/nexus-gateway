from database.session import SessionLocal
from models.merchant import Merchant
import sys

merchant_id = sys.argv[1]
db = SessionLocal()
m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
m.webhook_url = "http://localhost:8001/webhook"
db.commit()
print(f"Set webhook_url for {m.name}: {m.webhook_url}")
db.close()
