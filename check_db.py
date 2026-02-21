from database.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT enum_range(NULL::payment_status_enum)"))
    print("Enum values in DB:", result.fetchone()[0])
    cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='payment_intents'"))
    print("Columns:", [r[0] for r in cols])
