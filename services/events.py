from sqlalchemy.orm import Session
from models.event import SystemEvent

# Standardized Event Types
EVENT_MERCHANT_JOIN = "MERCHANT_JOIN"
EVENT_FAILOVER_RESCUE = "FAILOVER_RESCUE"
EVENT_UPTIME_CHECK = "UPTIME_CHECK"

def log_system_event(db: Session, event_type: str, message: str, data: dict = None):
    """Utility to log system-wide events for the Admin Oversight dashboard."""
    event = SystemEvent(event_type=event_type, message=message, data=data)
    db.add(event)
    db.commit()
