from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from database.session import Base

class SystemEvent(Base):
    __tablename__ = "system_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String)  # Onboard, Failover, TrafficBurst, etc.
    message = Column(String)
    data = Column(JSON, nullable=True) # Optional structured data
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
