import uuid
from sqlalchemy import Column, String
from database.session import Base


class Merchant(Base):
    """
    Represents a registered merchant on the Nexus Layer platform.
    Each merchant authenticates via a hashed API key and can receive
    payment event notifications via their webhook URL.
    """
    __tablename__ = "merchants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String, nullable=False)
    api_key_hashed = Column(String, nullable=False, unique=True)
    webhook_url = Column(String, nullable=True)
