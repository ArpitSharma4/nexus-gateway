from sqlalchemy import text
from database.session import engine, Base
import models.event
import models.announcement
import models.payment

def run_migration():
    print("Connecting to database for Oversight Elite migration...")
    with engine.begin() as conn:
        # 1. Create new tables
        print("Ensuring new tables (system_events, platform_announcements) exist...")
        Base.metadata.create_all(bind=engine)
        
        # 2. Add missing columns to payment_intents
        print("Checking for missing columns in 'payment_intents'...")
        columns_to_add = [
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE")
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

    print("Oversight Elite Migration complete!")

if __name__ == "__main__":
    run_migration()
