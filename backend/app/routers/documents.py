"""Document business routes with lifecycle, permissions, and audit logging."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.api_responses import DEFAULT_ERROR_RESPONSES
from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.audit_log import AuditLog
from ..models.document import Document
from ..models.document_type import DocumentType
from ..models.document_version import DocumentVersion
from ..models.enums import (
    AuditEventType,
    DocumentScope,
    DocumentStatus,
    UserRole,
)
from ..models.sector import Sector
from ..models.user import User
from ..schemas.document import (
    DocumentDecisionRequest,
    DocumentDraftCreateRequest,
    DocumentSearchItemResponse,
    DocumentSearchResponse,
    DocumentVersionResponse,
)

router = APIRouter(prefix="/documents", tags=["documents"], responses=DEFAULT_ERROR_RESPONSES)


def _require_roles(user: User, *roles: UserRole) -> None:
    if user.role not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil sem permissao para esta acao.",
        )


def _log_event(
    db: Session,
    *,
    entity_type: str,
    entity_id: int,
    event_type: AuditEventType,
    actor_user_id: int,
    previous_status: DocumentStatus | None = None,
    new_status: DocumentStatus | None = None,
    payload: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            event_type=event_type,
            previous_status=previous_status,
            new_status=new_status,
            actor_user_id=actor_user_id,
            payload=payload,
        )
    )


@router.post(
    "/drafts",
    response_model=DocumentVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_draft(
    payload: DocumentDraftCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentVersion:
    """Create a draft version for a document identity in the user's sector."""
    _require_roles(current_user, UserRole.AUTOR)

    if (
        payload.scope == DocumentScope.LOCAL
        and payload.sector_id != current_user.sector_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Documento local deve ser criado no setor do usuario.",
        )

    sector_exists = db.query(Sector.id).filter(Sector.id == payload.sector_id).first()
    if not sector_exists:
        raise HTTPException(status_code=404, detail="Setor nao encontrado.")

    dtype_exists = (
        db.query(DocumentType.id)
        .filter(DocumentType.id == payload.document_type_id)
        .first()
    )
    if not dtype_exists:
        raise HTTPException(status_code=404, detail="Tipo documental nao encontrado.")

    document = (
        db.query(Document)
        .filter(Document.sector_id == payload.sector_id, Document.code == payload.code)
        .first()
    )

    if document is None:
        document = Document(
            code=payload.code,
            title=payload.title,
            scope=payload.scope,
            sector_id=payload.sector_id,
            document_type_id=payload.document_type_id,
            created_by_user_id=current_user.id,
        )
        db.add(document)
        db.flush()
    else:
        document.title = payload.title
        document.scope = payload.scope
        document.document_type_id = payload.document_type_id

    last_version = (
        db.query(func.max(DocumentVersion.version_number))
        .filter(DocumentVersion.document_id == document.id)
        .scalar()
    )
    next_version = (last_version or 0) + 1

    draft = DocumentVersion(
        document_id=document.id,
        version_number=next_version,
        status=DocumentStatus.DRAFT,
        file_uri=payload.file_uri,
        expiration_date=payload.expiration_date,
        created_by_user_id=current_user.id,
    )

    db.add(draft)
    db.flush()

    _log_event(
        db,
        entity_type="document_version",
        entity_id=draft.id,
        event_type=AuditEventType.CREATED,
        actor_user_id=current_user.id,
        new_status=DocumentStatus.DRAFT,
        payload={"document_id": document.id, "version_number": next_version},
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail='Conflito ao criar rascunho para documento.',
        ) from exc

    db.refresh(draft)
    return draft


@router.post("/{version_id}/submit", response_model=DocumentVersionResponse)
def submit_for_review(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentVersion:
    """Move draft to IN_REVIEW by the draft author."""
    _require_roles(current_user, UserRole.AUTOR)

    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Versao nao encontrada.")

    if version.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Somente o autor pode submeter.")

    if version.status != DocumentStatus.DRAFT:
        raise HTTPException(
            status_code=409, detail="Somente rascunhos podem ser submetidos."
        )

    previous = version.status
    version.status = DocumentStatus.IN_REVIEW
    version.submitted_at = datetime.now(UTC)

    _log_event(
        db,
        entity_type="document_version",
        entity_id=version.id,
        event_type=AuditEventType.STATUS_CHANGED,
        actor_user_id=current_user.id,
        previous_status=previous,
        new_status=DocumentStatus.IN_REVIEW,
    )

    db.commit()
    db.refresh(version)
    return version


@router.post("/{version_id}/approve", response_model=DocumentVersionResponse)
def approve_version(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentVersion:
    """Approve version in review and obsolete the currently active one."""
    _require_roles(current_user, UserRole.COORDENADOR)

    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Versao nao encontrada.")

    document = db.query(Document).filter(Document.id == version.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")

    if document.sector_id != current_user.sector_id:
        raise HTTPException(
            status_code=403,
            detail="Coordenador so pode aprovar documentos do proprio setor.",
        )

    if version.status != DocumentStatus.IN_REVIEW:
        raise HTTPException(status_code=409, detail="Versao precisa estar em revisao.")

    previous = version.status

    current_active = (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id == version.document_id,
            DocumentVersion.status == DocumentStatus.ACTIVE,
            DocumentVersion.id != version.id,
        )
        .first()
    )

    if current_active:
        prev_active_status = current_active.status
        current_active.status = DocumentStatus.OBSOLETE

        _log_event(
            db,
            entity_type="document_version",
            entity_id=current_active.id,
            event_type=AuditEventType.STATUS_CHANGED,
            actor_user_id=current_user.id,
            previous_status=prev_active_status,
            new_status=DocumentStatus.OBSOLETE,
        )

    version.status = DocumentStatus.ACTIVE
    version.approved_by_user_id = current_user.id
    version.approved_at = datetime.now(UTC)
    version.rejection_reason = None

    _log_event(
        db,
        entity_type="document_version",
        entity_id=version.id,
        event_type=AuditEventType.APPROVED,
        actor_user_id=current_user.id,
        previous_status=previous,
        new_status=DocumentStatus.ACTIVE,
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Conflito ao promover versao vigente.",
        ) from exc

    db.refresh(version)
    return version


@router.post("/{version_id}/reject", response_model=DocumentVersionResponse)
def reject_version(
    version_id: int,
    payload: DocumentDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentVersion:
    """Reject version in review, moving it back to DRAFT."""
    _require_roles(current_user, UserRole.COORDENADOR)

    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Versao nao encontrada.")

    document = db.query(Document).filter(Document.id == version.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")

    if document.sector_id != current_user.sector_id:
        raise HTTPException(
            status_code=403,
            detail="Coordenador so pode rejeitar documentos do proprio setor.",
        )

    if version.status != DocumentStatus.IN_REVIEW:
        raise HTTPException(status_code=409, detail="Versao precisa estar em revisao.")

    previous = version.status
    version.status = DocumentStatus.DRAFT
    version.rejection_reason = payload.reason

    _log_event(
        db,
        entity_type="document_version",
        entity_id=version.id,
        event_type=AuditEventType.REJECTED,
        actor_user_id=current_user.id,
        previous_status=previous,
        new_status=DocumentStatus.DRAFT,
        payload={"reason": payload.reason},
    )

    db.commit()
    db.refresh(version)
    return version


@router.get("/search", response_model=DocumentSearchResponse)
def search_active_documents(
    q: str | None = Query(default=None, min_length=1),
    sector_id: int | None = Query(default=None),
    document_type_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentSearchResponse:
    """Search always returns active versions filtered by user visibility."""
    base_query = (
        db.query(DocumentVersion, Document)
        .join(Document, Document.id == DocumentVersion.document_id)
        .filter(DocumentVersion.status == DocumentStatus.ACTIVE)
        .filter(
            or_(
                Document.scope == DocumentScope.CORPORATE,
                Document.sector_id == current_user.sector_id,
            )
        )
    )

    if q:
        pattern = f"%{q}%"
        base_query = base_query.filter(
            or_(Document.code.ilike(pattern), Document.title.ilike(pattern))
        )

    if sector_id is not None:
        base_query = base_query.filter(Document.sector_id == sector_id)

    if document_type_id is not None:
        base_query = base_query.filter(Document.document_type_id == document_type_id)

    total = base_query.count()

    rows = (
        base_query.order_by(Document.code.asc(), DocumentVersion.version_number.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = [
        DocumentSearchItemResponse(
            document_id=doc.id,
            code=doc.code,
            title=doc.title,
            scope=doc.scope,
            sector_id=doc.sector_id,
            document_type_id=doc.document_type_id,
            version_id=version.id,
            version_number=version.version_number,
            status=version.status,
            expiration_date=version.expiration_date,
            file_uri=version.file_uri,
            approved_at=version.approved_at,
        )
        for version, doc in rows
    ]

    return DocumentSearchResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{document_id}/versions", response_model=list[DocumentVersionResponse])
def list_document_versions(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentVersion]:
    """List versions respecting visibility; readers only receive ACTIVE version."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")

    if (
        document.scope == DocumentScope.LOCAL
        and document.sector_id != current_user.sector_id
    ):
        raise HTTPException(
            status_code=403, detail="Sem acesso ao documento local de outro setor."
        )

    base_query = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    )

    if current_user.role == UserRole.LEITOR:
        return (
            base_query.filter(DocumentVersion.status == DocumentStatus.ACTIVE)
            .order_by(DocumentVersion.version_number.desc())
            .all()
        )

    return base_query.order_by(DocumentVersion.version_number.desc()).all()


