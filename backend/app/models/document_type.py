from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from ..database import Base

class DocumentType(Base):
    """Document taxonomy classification."""

    __tablename__ = "document_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    documents = relationship("Document", back_populates="document_type")
