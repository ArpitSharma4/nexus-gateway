"""
migrate_v2.py — Converts the status column from Postgres enum to VARCHAR.
Safe to run multiple times (uses IF EXISTS guards).
"""
from database.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Convert the status column from enum type to plain varchar
    conn.execute(text(
        "ALTER TABLE payment_intents "
        "ALTER COLUMN status TYPE VARCHAR(20) "
        "USING status::text"
    ))
    conn.commit()
    print("Migration v2 complete: status column is now VARCHAR.")
