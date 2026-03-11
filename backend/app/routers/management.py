"""Support endpoints for sectors, document types, and users."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.api_responses import DEFAULT_ERROR_RESPONSES
from ..core.security import get_password_hash
from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.document_type import DocumentType
from ..models.enums import UserRole
from ..models.sector import Sector
from ..models.user import User
from ..schemas.management import (
    DocumentTypeCreateRequest,
    DocumentTypeResponse,
    SectorCreateRequest,
    SectorResponse,
    UserCreateRequest,
    UserListResponse,
    UserResponse,
)

router = APIRouter(tags=["management"], responses=DEFAULT_ERROR_RESPONSES)


def _require_coordinator(user: User) -> None:
    if user.role != UserRole.COORDENADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente coordenador pode realizar esta acao.",
        )


@router.get("/sectors", response_model=list[SectorResponse])
def list_sectors(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Sector]:
    return db.query(Sector).order_by(Sector.name.asc()).all()


@router.post("/sectors", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
def create_sector(
    payload: SectorCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Sector:
    _require_coordinator(current_user)

    sector = Sector(name=payload.name.strip())
    db.add(sector)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Setor ja existe.") from exc

    db.refresh(sector)
    return sector


@router.get("/document-types", response_model=list[DocumentTypeResponse])
def list_document_types(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DocumentType]:
    return db.query(DocumentType).order_by(DocumentType.name.asc()).all()


@router.post(
    "/document-types",
    response_model=DocumentTypeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_document_type(
    payload: DocumentTypeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentType:
    _require_coordinator(current_user)

    doc_type = DocumentType(name=payload.name.strip())
    db.add(doc_type)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tipo documental ja existe.") from exc

    db.refresh(doc_type)
    return doc_type


@router.get("/users", response_model=UserListResponse)
def list_users(
    q: str | None = Query(default=None, min_length=1),
    role: UserRole | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserListResponse:
    _require_coordinator(current_user)

    query = db.query(User).filter(User.sector_id == current_user.sector_id)

    if q:
        pattern = f"%{q}%"
        query = query.filter((User.name.ilike(pattern)) | (User.email.ilike(pattern)))

    if role is not None:
        query = query.filter(User.role == role)

    total = query.count()
    items = query.order_by(User.name.asc()).offset(skip).limit(limit).all()

    return UserListResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    _require_coordinator(current_user)

    if payload.role == UserRole.COORDENADOR and current_user.role != UserRole.COORDENADOR:
        raise HTTPException(status_code=403, detail="Sem permissao para criar coordenador.")

    target_sector_id = payload.sector_id or current_user.sector_id
    if target_sector_id != current_user.sector_id:
        raise HTTPException(
            status_code=403,
            detail="Coordenador so pode criar usuarios no proprio setor.",
        )

    sector = db.query(Sector).filter(Sector.id == target_sector_id).first()
    if not sector:
        raise HTTPException(status_code=404, detail="Setor nao encontrado.")

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        sector_id=target_sector_id,
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email ja cadastrado.") from exc

    db.refresh(user)
    return user

