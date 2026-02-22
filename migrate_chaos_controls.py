import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    try:
        print("Adding 'is_simulated_outage' to 'gateway_health' if it doesn't exist...")
        cur.execute("""
            ALTER TABLE gateway_health 
            ADD COLUMN IF NOT EXISTS is_simulated_outage BOOLEAN DEFAULT FALSE;
        """)
        conn.commit()
        print("Migration successful: 'is_simulated_outage' column added.")
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
