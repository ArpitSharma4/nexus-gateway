import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from database.session import SessionLocal
from services.events import log_system_event, EVENT_UPTIME_CHECK

def trigger_test_event():
    db = SessionLocal()
    try:
        print("Triggering UPTIME_CHECK event...")
        log_system_event(db, EVENT_UPTIME_CHECK, f"Global Uptime Verifier: 99.99% (Nexus Elite)")
        print("Event logged successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    trigger_test_event()
