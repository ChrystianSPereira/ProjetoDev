"""Schemas for audit trail listing endpoints."""

from datetime import datetime

from pydantic import BaseModel

from ..models.enums import AuditEventType, DocumentScope, DocumentStatus


class AuditLogItemResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    event_type: AuditEventType
    previous_status: DocumentStatus | None
    new_status: DocumentStatus | None
    actor_user_id: int
    actor_user_name: str
    occurred_at: datetime
    payload: dict | None
    document_id: int
    document_code: str
    document_title: str
    document_scope: DocumentScope
    document_sector_id: int
    version_number: int


class AuditLogListResponse(BaseModel):
    items: list[AuditLogItemResponse]
    total: int
    skip: int
    limit: int
