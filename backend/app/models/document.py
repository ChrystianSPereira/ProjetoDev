from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from ..database import Base
from .enums import DocumentScope


class Document(Base):
    """Document root entity; mutable business identity across versions."""

    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("sector_id", "code", name="uq_sector_document_code"), )

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    scope = Column(Enum(DocumentScope, name="document_scope"), nullable=False)

    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=False, index=True)
    document_type_id = Column(Integer, ForeignKey("document_types.id"), nullable=False, index=True)

    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sector = relationship("Sector", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")

