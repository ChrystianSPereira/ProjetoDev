from sqlalchemy import JSON, Column, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from ..database import Base
from .enums import AuditEventType, DocumentStatus


class AuditLog(Base):
    """Immutable compliance trail for relevant user/system actions."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    event_type = Column(Enum(AuditEventType, name="audit_event_type"), nullable=False)

    previous_status = Column(
        Enum(DocumentStatus, name="document_status"), nullable=True, index=True
    )
    new_status = Column(
        Enum(DocumentStatus, name="document_status"), nullable=True, index=True
    )

    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    occurred_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    payload = Column(JSON, nullable=True)

    actor = relationship("User", foreign_keys=[actor_user_id])

