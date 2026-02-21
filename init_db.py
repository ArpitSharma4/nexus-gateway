"""
init_db.py — One-time database initialization script.

This script reads the DATABASE_URL from the .env file,
connects to the Supabase PostgreSQL instance, and creates
all tables defined in the ORM models if they don't already exist.

Usage:
    Ensure your .env file has a valid DATABASE_URL, then run:
        python init_db.py
"""

from database.session import engine, Base

# Import all models so that they are registered on the Base metadata
# before we call create_all. Without these imports, the tables won't be created.
import models.merchant       # noqa: F401
import models.payment        # noqa: F401
import models.gateway        # noqa: F401
import models.routing_rule   # noqa: F401


def init_db():
    print("Connecting to the database...")
    print(f"  Engine: {engine.url}")
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("All tables created successfully!")
    print("  Tables: merchants, payment_intents, gateway_configs, gateway_health, routing_rules")


if __name__ == "__main__":
    init_db()
