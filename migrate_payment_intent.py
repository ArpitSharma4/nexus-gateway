"""
migrate_payment_intent.py — One-time migration script.
Adds the 'created' enum value and merchant_id column to payment_intents.
"""
from database.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'created'"))
    conn.execute(text("ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS merchant_id VARCHAR NOT NULL DEFAULT ''"))
    conn.commit()
    print("Migration complete.")
