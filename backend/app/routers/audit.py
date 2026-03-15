"""Audit trail routes for compliance and traceability."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..core.api_responses import DEFAULT_ERROR_RESPONSES
from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.audit_log import AuditLog
from ..models.document import Document
from ..models.document_version import DocumentVersion
from ..models.enums import AuditEventType, DocumentScope, UserRole
from ..models.user import User
from ..schemas.audit import AuditLogItemResponse, AuditLogListResponse

router = APIRouter(prefix="/audit", tags=["audit"], responses=DEFAULT_ERROR_RESPONSES)


def _require_governance_profile(user: User) -> None:
    """Allow compliance access for coordinator/admin governance profiles."""
    if user.role not in (UserRole.COORDENADOR, UserRole.ADMINISTRADOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente coordenador/admin pode consultar auditoria.",
        )


@router.get("/logs", response_model=AuditLogListResponse)
def list_audit_logs(
    document_id: int | None = Query(default=None, ge=1),
    version_id: int | None = Query(default=None, ge=1),
    actor_user_id: int | None = Query(default=None, ge=1),
    event_type: AuditEventType | None = Query(default=None),
    start_at: datetime | None = Query(default=None),
    end_at: datetime | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuditLogListResponse:
    """List immutable audit events with sector and corporate visibility rules."""
    _require_governance_profile(current_user)

    if start_at and end_at and end_at < start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parametro end_at deve ser maior ou igual a start_at.",
        )

    query = (
        db.query(AuditLog, DocumentVersion, Document, User)
        .join(
            DocumentVersion,
            and_(
                AuditLog.entity_type == "document_version",
                AuditLog.entity_id == DocumentVersion.id,
            ),
        )
        .join(Document, Document.id == DocumentVersion.document_id)
        .join(User, User.id == AuditLog.actor_user_id)
    )

    if current_user.role != UserRole.ADMINISTRADOR:
        query = query.filter(
            or_(
                Document.scope == DocumentScope.CORPORATE,
                Document.sector_id == current_user.sector_id,
            )
        )

    if document_id is not None:
        query = query.filter(Document.id == document_id)

    if version_id is not None:
        query = query.filter(DocumentVersion.id == version_id)

    if actor_user_id is not None:
        query = query.filter(AuditLog.actor_user_id == actor_user_id)

    if event_type is not None:
        query = query.filter(AuditLog.event_type == event_type)

    if start_at is not None:
        query = query.filter(AuditLog.occurred_at >= start_at)

    if end_at is not None:
        query = query.filter(AuditLog.occurred_at <= end_at)

    total = query.count()

    rows = (
        query.order_by(AuditLog.occurred_at.desc(), AuditLog.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = [
        AuditLogItemResponse(
            id=audit.id,
            entity_type=audit.entity_type,
            entity_id=audit.entity_id,
            event_type=audit.event_type,
            previous_status=audit.previous_status,
            new_status=audit.new_status,
            actor_user_id=audit.actor_user_id,
            actor_user_name=actor.name,
            occurred_at=audit.occurred_at,
            payload=audit.payload,
            document_id=document.id,
            document_code=document.code,
            document_title=document.title,
            document_scope=document.scope,
            document_sector_id=document.sector_id,
            version_number=version.version_number,
        )
        for audit, version, document, actor in rows
    ]

    return AuditLogListResponse(items=items, total=total, skip=skip, limit=limit)

