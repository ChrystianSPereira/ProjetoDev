"""Document business routes with lifecycle, permissions, and audit logging."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from ..core.api_responses import DEFAULT_ERROR_RESPONSES
from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.audit_log import AuditLog
from ..models.document import Document
from ..models.document_type import DocumentType
from ..models.document_version import DocumentVersion
from ..models.enums import AuditEventType, DocumentScope, DocumentStatus, UserRole
from ..models.sector import Sector
from ..models.user import User
from ..schemas.document import (
    DocumentAuditItemResponse,
    DocumentDecisionRequest,
    DocumentDetailResponse,
    DocumentDraftCreateRequest,
    DocumentListItemResponse,
    DocumentListResponse,
    DocumentSearchItemResponse,
    DocumentSearchResponse,
    DocumentVersionDetailResponse,
    DocumentVersionResponse,
    DocumentWorkflowItemResponse,
    DocumentWorkflowListResponse,
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


def _to_workflow_item(version: DocumentVersion, document: Document) -> DocumentWorkflowItemResponse:
    return DocumentWorkflowItemResponse(
        version_id=version.id,
        document_id=document.id,
        code=document.code,
        title=document.title,
        scope=document.scope,
        sector_id=document.sector_id,
        document_type_id=document.document_type_id,
        version_number=version.version_number,
        status=version.status,
        expiration_date=version.expiration_date,
        created_at=version.created_at,
        submitted_at=version.submitted_at,
    )


def _extract_file_name(file_uri: str) -> str:
    if not file_uri:
        return "arquivo"
    clean = file_uri.replace("\\", "/")
    return clean.split("/")[-1] or "arquivo"


def _version_updated_at(version: DocumentVersion) -> datetime:
    return version.approved_at or version.submitted_at or version.created_at


def _document_is_visible(document: Document, current_user: User) -> bool:
    if document.scope == DocumentScope.CORPORATE:
        return True
    return document.sector_id == current_user.sector_id


def _pick_display_version(
    versions_desc: list[DocumentVersion],
    *,
    current_user: User,
    status_filter: DocumentStatus | None,
) -> DocumentVersion | None:
    active_version = next((version for version in versions_desc if version.status == DocumentStatus.ACTIVE), None)

    if current_user.role == UserRole.LEITOR:
        if status_filter is not None and status_filter != DocumentStatus.ACTIVE:
            return None
        return active_version

    if status_filter is not None:
        return next((version for version in versions_desc if version.status == status_filter), None)

    return active_version or (versions_desc[0] if versions_desc else None)


def _audit_description(audit: AuditLog) -> str:
    if audit.event_type == AuditEventType.CREATED:
        return "Rascunho criado."
    if audit.event_type == AuditEventType.APPROVED:
        return "Versao aprovada e publicada como Vigente."
    if audit.event_type == AuditEventType.REJECTED:
        reason = (audit.payload or {}).get("reason") if isinstance(audit.payload, dict) else None
        return f"Versao reprovada. Motivo: {reason}" if reason else "Versao reprovada."
    if audit.event_type == AuditEventType.STATUS_CHANGED:
        return f"Status alterado de {audit.previous_status} para {audit.new_status}."
    return "Evento registrado."


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
    _require_roles(current_user, UserRole.AUTOR, UserRole.ADMINISTRADOR)

    target_sector_id = current_user.sector_id
    if not target_sector_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Operacao nao disponivel no momento.",
        )

    sector_exists = db.query(Sector.id).filter(Sector.id == target_sector_id).first()
    if not sector_exists:
        raise HTTPException(status_code=404, detail="Setor nao encontrado.")

    dtype_exists = db.query(DocumentType.id).filter(DocumentType.id == payload.document_type_id).first()
    if not dtype_exists:
        raise HTTPException(status_code=404, detail="Tipo documental nao encontrado.")

    code_input = (payload.code or "").strip() or None

    document = None
    if code_input:
        document = (
            db.query(Document)
            .filter(Document.sector_id == target_sector_id, Document.code == code_input)
            .first()
        )

    if document is None:
        document = Document(
            code=code_input or "TEMP",
            title=payload.title,
            scope=payload.scope,
            sector_id=target_sector_id,
            document_type_id=payload.document_type_id,
            created_by_user_id=current_user.id,
        )
        db.add(document)
        db.flush()

        if not code_input:
            document.code = f"DOC-{document.id:03d}"
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
            detail="Conflito ao criar rascunho para documento.",
        ) from exc

    db.refresh(draft)
    return draft


@router.get("", response_model=DocumentListResponse)
def list_documents(
    q: str | None = Query(default=None, min_length=1),
    sector_id: int | None = Query(default=None, ge=1),
    document_type_id: int | None = Query(default=None, ge=1),
    scope: DocumentScope | None = Query(default=None),
    status_filter: DocumentStatus | None = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentListResponse:
    """Return one representative version per visible document with pagination and filters."""
    query = db.query(Document).options(
        joinedload(Document.sector),
        joinedload(Document.document_type),
        joinedload(Document.versions).joinedload(DocumentVersion.created_by),
        joinedload(Document.versions).joinedload(DocumentVersion.approved_by),
    )

    if current_user.role != UserRole.ADMINISTRADOR:
        query = query.filter(
            or_(
                Document.scope == DocumentScope.CORPORATE,
                Document.sector_id == current_user.sector_id,
            )
        )

    if q:
        pattern = f"%{q}%"
        query = query.filter(or_(Document.code.ilike(pattern), Document.title.ilike(pattern)))

    if sector_id is not None:
        query = query.filter(Document.sector_id == sector_id)

    if document_type_id is not None:
        query = query.filter(Document.document_type_id == document_type_id)

    if scope is not None:
        query = query.filter(Document.scope == scope)

    documents = query.order_by(Document.code.asc()).all()

    items_all: list[DocumentListItemResponse] = []
    for document in documents:
        versions_desc = sorted(document.versions, key=lambda version: version.version_number, reverse=True)
        selected = _pick_display_version(
            versions_desc,
            current_user=current_user,
            status_filter=status_filter,
        )
        if not selected:
            continue

        items_all.append(
            DocumentListItemResponse(
                document_id=document.id,
                version_id=selected.id,
                code=document.code,
                title=document.title,
                sector_id=document.sector_id,
                sector_name=document.sector.name,
                document_type_id=document.document_type_id,
                document_type_name=document.document_type.name,
                scope=document.scope,
                version_number=selected.version_number,
                status=selected.status,
                expiration_date=selected.expiration_date,
                file_uri=selected.file_uri,
                file_name=_extract_file_name(selected.file_uri),
                created_by_user_id=selected.created_by_user_id,
                created_by_name=selected.created_by.name if selected.created_by else "-",
                approved_by_user_id=selected.approved_by_user_id,
                approved_by_name=selected.approved_by.name if selected.approved_by else None,
                updated_at=_version_updated_at(selected),
            )
        )

    total = len(items_all)
    items = items_all[skip : skip + limit]
    return DocumentListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/my-drafts", response_model=DocumentWorkflowListResponse)
def list_my_drafts(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentWorkflowListResponse:
    """List the current author's draft versions for intuitive submit flow."""
    _require_roles(current_user, UserRole.AUTOR, UserRole.ADMINISTRADOR)

    query = (
        db.query(DocumentVersion, Document)
        .join(Document, Document.id == DocumentVersion.document_id)
        .filter(DocumentVersion.status == DocumentStatus.DRAFT)
    )

    if current_user.role == UserRole.AUTOR:
        query = query.filter(DocumentVersion.created_by_user_id == current_user.id)

    total = query.count()
    rows = (
        query.order_by(DocumentVersion.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = [_to_workflow_item(version, doc) for version, doc in rows]
    return DocumentWorkflowListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/review-queue", response_model=DocumentWorkflowListResponse)
def list_review_queue(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentWorkflowListResponse:
    """List versions in review for coordinator approval flow."""
    _require_roles(current_user, UserRole.COORDENADOR, UserRole.ADMINISTRADOR)

    query = (
        db.query(DocumentVersion, Document)
        .join(Document, Document.id == DocumentVersion.document_id)
        .filter(DocumentVersion.status == DocumentStatus.IN_REVIEW)
    )

    if current_user.role == UserRole.COORDENADOR:
        query = query.filter(Document.sector_id == current_user.sector_id)

    total = query.count()
    rows = (
        query.order_by(DocumentVersion.submitted_at.desc(), DocumentVersion.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = [_to_workflow_item(version, doc) for version, doc in rows]
    return DocumentWorkflowListResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/{version_id}/submit", response_model=DocumentVersionResponse)
def submit_for_review(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentVersion:
    """Move draft to IN_REVIEW by the draft author."""
    _require_roles(current_user, UserRole.AUTOR, UserRole.ADMINISTRADOR)

    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Versao nao encontrada.")

    if current_user.role != UserRole.ADMINISTRADOR and version.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Somente o autor pode submeter.")

    if version.status != DocumentStatus.DRAFT:
        raise HTTPException(status_code=409, detail="Somente rascunhos podem ser submetidos.")

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
    _require_roles(current_user, UserRole.COORDENADOR, UserRole.ADMINISTRADOR)

    version = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.id == version_id)
        .with_for_update()
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Versao nao encontrada.")

    document = (
        db.query(Document)
        .filter(Document.id == version.document_id)
        .with_for_update()
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")

    if current_user.role == UserRole.COORDENADOR and document.sector_id != current_user.sector_id:
        raise HTTPException(
            status_code=403,
            detail="Coordenador so pode aprovar documentos do proprio setor.",
        )

    if version.status != DocumentStatus.IN_REVIEW:
        raise HTTPException(status_code=409, detail="Versao precisa estar em revisao.")

    previous = version.status

    db.query(DocumentVersion.id).filter(DocumentVersion.document_id == version.document_id).with_for_update().all()

    current_active = (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id == version.document_id,
            DocumentVersion.status == DocumentStatus.ACTIVE,
            DocumentVersion.id != version.id,
        )
        .with_for_update()
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
    _require_roles(current_user, UserRole.COORDENADOR, UserRole.ADMINISTRADOR)

    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Versao nao encontrada.")

    document = db.query(Document).filter(Document.id == version.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")

    if current_user.role == UserRole.COORDENADOR and document.sector_id != current_user.sector_id:
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
    )

    if current_user.role != UserRole.ADMINISTRADOR:
        base_query = base_query.filter(
            or_(
                Document.scope == DocumentScope.CORPORATE,
                Document.sector_id == current_user.sector_id,
            )
        )

    if q:
        pattern = f"%{q}%"
        base_query = base_query.filter(or_(Document.code.ilike(pattern), Document.title.ilike(pattern)))

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


@router.get("/{document_id}/detail", response_model=DocumentDetailResponse)
def get_document_detail(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentDetailResponse:
    """Return document metadata, versions history, and audit trail with visibility rules."""
    document = (
        db.query(Document)
        .options(
            joinedload(Document.sector),
            joinedload(Document.document_type),
            joinedload(Document.created_by),
            joinedload(Document.versions).joinedload(DocumentVersion.created_by),
            joinedload(Document.versions).joinedload(DocumentVersion.approved_by),
        )
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")

    if not _document_is_visible(document, current_user):
        raise HTTPException(status_code=403, detail="Sem acesso ao documento local de outro setor.")

    versions_desc = sorted(document.versions, key=lambda version: version.version_number, reverse=True)

    if current_user.role == UserRole.LEITOR:
        versions_desc = [version for version in versions_desc if version.status == DocumentStatus.ACTIVE]

    version_ids = [version.id for version in versions_desc]

    version_items = [
        DocumentVersionDetailResponse(
            id=version.id,
            version_number=version.version_number,
            status=version.status,
            file_uri=version.file_uri,
            file_name=_extract_file_name(version.file_uri),
            expiration_date=version.expiration_date,
            created_by_user_id=version.created_by_user_id,
            created_by_name=version.created_by.name if version.created_by else "-",
            approved_by_user_id=version.approved_by_user_id,
            approved_by_name=version.approved_by.name if version.approved_by else None,
            created_at=version.created_at,
            submitted_at=version.submitted_at,
            approved_at=version.approved_at,
            rejection_reason=version.rejection_reason,
            updated_at=_version_updated_at(version),
        )
        for version in versions_desc
    ]

    audit_items: list[DocumentAuditItemResponse] = []
    if version_ids:
        audit_rows = (
            db.query(AuditLog, User)
            .outerjoin(User, User.id == AuditLog.actor_user_id)
            .filter(AuditLog.entity_type == "document_version")
            .filter(AuditLog.entity_id.in_(version_ids))
            .order_by(AuditLog.occurred_at.desc(), AuditLog.id.desc())
            .all()
        )

        audit_items = [
            DocumentAuditItemResponse(
                id=audit.id,
                version_id=audit.entity_id,
                event_type=audit.event_type,
                previous_status=audit.previous_status,
                new_status=audit.new_status,
                actor_user_id=audit.actor_user_id,
                actor_user_name=actor.name if actor else f"Usuario {audit.actor_user_id}",
                occurred_at=audit.occurred_at,
                description=_audit_description(audit),
                payload=audit.payload,
            )
            for audit, actor in audit_rows
        ]

    active_version = next((version for version in document.versions if version.status == DocumentStatus.ACTIVE), None)
    updated_at = max((_version_updated_at(version) for version in document.versions), default=document.created_at)

    return DocumentDetailResponse(
        document_id=document.id,
        code=document.code,
        title=document.title,
        scope=document.scope,
        sector_id=document.sector_id,
        sector_name=document.sector.name,
        document_type_id=document.document_type_id,
        document_type_name=document.document_type.name,
        created_by_user_id=document.created_by_user_id,
        created_by_name=document.created_by.name if document.created_by else "-",
        updated_at=updated_at,
        active_version_id=active_version.id if active_version else None,
        versions=version_items,
        audits=audit_items,
    )


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

    if document.scope == DocumentScope.LOCAL and document.sector_id != current_user.sector_id:
        raise HTTPException(status_code=403, detail="Sem acesso ao documento local de outro setor.")

    base_query = db.query(DocumentVersion).filter(DocumentVersion.document_id == document_id)

    if current_user.role == UserRole.LEITOR:
        return (
            base_query.filter(DocumentVersion.status == DocumentStatus.ACTIVE)
            .order_by(DocumentVersion.version_number.desc())
            .all()
        )

    return base_query.order_by(DocumentVersion.version_number.desc()).all()
