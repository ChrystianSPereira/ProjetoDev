from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from ..database import Base

class Sector(Base):
    """Organizational scope used for ownership and access segregation."""

    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    users = relationship("User", back_populates="sector")
    documents = relationship("Document", back_populates="sector")

