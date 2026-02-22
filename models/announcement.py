from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from database.session import Base

class PlatformAnnouncement(Base):
    __tablename__ = "platform_announcements"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    is_active = Column(Boolean, default=True)
    severity = Column(String, default="info") # info, warning, critical
    created_at = Column(DateTime(timezone=True), server_default=func.now())
