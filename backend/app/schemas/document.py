"""Document lifecycle request/response schemas."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from ..models.enums import AuditEventType, DocumentScope, DocumentStatus


class DocumentDraftCreateRequest(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=255)
    scope: DocumentScope
    sector_id: int
    document_type_id: int
    expiration_date: date
    file_uri: str = Field(min_length=1, max_length=500)


class DocumentDecisionRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: int
    status: DocumentStatus
    file_uri: str
    expiration_date: date
    created_by_user_id: int
    approved_by_user_id: int | None
    created_at: datetime
    submitted_at: datetime | None
    approved_at: datetime | None
    rejection_reason: str | None

    model_config = {"from_attributes": True}


class DocumentWorkflowItemResponse(BaseModel):
    version_id: int
    document_id: int
    code: str
    title: str
    scope: DocumentScope
    sector_id: int
    document_type_id: int
    version_number: int
    status: DocumentStatus
    expiration_date: date
    created_at: datetime
    submitted_at: datetime | None


class DocumentWorkflowListResponse(BaseModel):
    items: list[DocumentWorkflowItemResponse]
    total: int
    skip: int
    limit: int


class DocumentListItemResponse(BaseModel):
    document_id: int
    version_id: int
    code: str
    title: str
    sector_id: int
    sector_name: str
    document_type_id: int
    document_type_name: str
    scope: DocumentScope
    version_number: int
    status: DocumentStatus
    expiration_date: date
    file_uri: str
    file_name: str
    created_by_user_id: int
    created_by_name: str
    approved_by_user_id: int | None
    approved_by_name: str | None
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentListItemResponse]
    total: int
    skip: int
    limit: int


class DocumentSearchItemResponse(BaseModel):
    document_id: int
    code: str
    title: str
    scope: DocumentScope
    sector_id: int
    document_type_id: int
    version_id: int
    version_number: int
    status: DocumentStatus
    expiration_date: date
    file_uri: str
    approved_at: datetime | None


class DocumentSearchResponse(BaseModel):
    items: list[DocumentSearchItemResponse]
    total: int
    skip: int
    limit: int


class DocumentVersionDetailResponse(BaseModel):
    id: int
    version_number: int
    status: DocumentStatus
    file_uri: str
    file_name: str
    expiration_date: date
    created_by_user_id: int
    created_by_name: str
    approved_by_user_id: int | None
    approved_by_name: str | None
    created_at: datetime
    submitted_at: datetime | None
    approved_at: datetime | None
    rejection_reason: str | None
    updated_at: datetime


class DocumentAuditItemResponse(BaseModel):
    id: int
    version_id: int
    event_type: AuditEventType
    previous_status: DocumentStatus | None
    new_status: DocumentStatus | None
    actor_user_id: int
    actor_user_name: str
    occurred_at: datetime
    description: str
    payload: dict | None


class DocumentDetailResponse(BaseModel):
    document_id: int
    code: str
    title: str
    scope: DocumentScope
    sector_id: int
    sector_name: str
    document_type_id: int
    document_type_name: str
    created_by_user_id: int
    created_by_name: str
    updated_at: datetime
    active_version_id: int | None
    versions: list[DocumentVersionDetailResponse]
    audits: list[DocumentAuditItemResponse]

