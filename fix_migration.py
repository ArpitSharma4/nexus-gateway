"""
fix_migration.py — Patches the database with missing columns and tables.
SQLAlchemy create_all does not add columns to existing tables, so we
manually add them here using raw SQL for the payment_intents table.
"""

from sqlalchemy import text
from database.session import engine, Base
import models.gateway
import models.routing_rule

def run_migration():
    print("Connecting to database for migration...")
    with engine.begin() as conn:
        # 1. Ensure new tables exist (gateway_configs, gateway_health, routing_rules)
        print("Checking for missing tables...")
        Base.metadata.create_all(bind=engine)
        
        # 2. Add missing columns to payment_intents
        print("Checking for missing columns in 'payment_intents'...")
        columns_to_add = [
            ("gateway_used", "VARCHAR(50)"),
            ("trace_log", "TEXT")
        ]
        
        # Get existing columns
        result = conn.execute(text("SELECT * FROM payment_intents LIMIT 0"))
        existing_columns = result.keys()
        
        for col_name, col_type in columns_to_add:
            if col_name not in existing_columns:
                print(f"  Adding column: {col_name}...")
                conn.execute(text(f"ALTER TABLE payment_intents ADD COLUMN {col_name} {col_type}"))
            else:
                print(f"  Column {col_name} already exists.")

    print("Migration complete!")

if __name__ == "__main__":
    run_migration()
