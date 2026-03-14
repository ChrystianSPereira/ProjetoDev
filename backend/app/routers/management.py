"""Support endpoints for sectors, document types, and users."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
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
    SectorUpdateRequest,
    UserCreateRequest,
    UserListResponse,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter(tags=["management"], responses=DEFAULT_ERROR_RESPONSES)


def _require_management_access(user: User) -> None:
    """Allow management actions only for administrator."""
    if user.role != UserRole.ADMINISTRADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente administrador pode realizar esta acao.",
        )


def _require_can_assign_admin(current_user: User, target_role: UserRole | None) -> None:
    """Only administrators can create/promote users to administrator role."""
    if target_role == UserRole.ADMINISTRADOR and current_user.role != UserRole.ADMINISTRADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente administrador pode atribuir perfil ADMINISTRADOR.",
        )


def _get_user_by_id(db: Session, user_id: int) -> User:
    """Load user by id for administrator-scoped operations."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")
    return user


@router.get("/sectors", response_model=list[SectorResponse])
def list_sectors(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Sector]:
    """Return all registered sectors ordered by creation id."""
    return db.query(Sector).order_by(Sector.id.asc()).all()


@router.post("/sectors", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
def create_sector(
    payload: SectorCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Sector:
    """Create a new sector (administrator only)."""
    _require_management_access(current_user)

    sector = Sector(name=payload.name.strip())
    db.add(sector)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Setor ja existe.") from exc

    db.refresh(sector)
    return sector




@router.put("/sectors/{sector_id}", response_model=SectorResponse)
def update_sector(
    sector_id: int,
    payload: SectorUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Sector:
    """Update sector name (administrator only)."""
    _require_management_access(current_user)

    sector = db.query(Sector).filter(Sector.id == sector_id).first()
    if not sector:
        raise HTTPException(status_code=404, detail="Setor nao encontrado.")

    sector.name = payload.name.strip()

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Setor ja existe.") from exc

    db.refresh(sector)
    return sector


@router.delete("/sectors/{sector_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sector(
    sector_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Delete sector if it has no linked users/documents (administrator only)."""
    _require_management_access(current_user)

    sector = db.query(Sector).filter(Sector.id == sector_id).first()
    if not sector:
        raise HTTPException(status_code=404, detail="Setor nao encontrado.")

    db.delete(sector)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Setor possui vinculacoes e nao pode ser excluido.",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/document-types", response_model=list[DocumentTypeResponse])
def list_document_types(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DocumentType]:
    """Return all document taxonomy types ordered by name."""
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
    """Create a new document type (administrator only)."""
    _require_management_access(current_user)

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
    sector_id: int | None = Query(default=None, ge=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserListResponse:
    """List users for administrator scope."""
    _require_management_access(current_user)

    query = db.query(User)

    if sector_id is not None:
        query = query.filter(User.sector_id == sector_id)

    if q:
        pattern = f"%{q}%"
        query = query.filter((User.name.ilike(pattern)) | (User.email.ilike(pattern)))

    if role is not None:
        query = query.filter(User.role == role)

    total = query.count()
    items = query.order_by(User.id.asc()).offset(skip).limit(limit).all()

    return UserListResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Create user with role constraints controlled by administrator."""
    _require_management_access(current_user)
    _require_can_assign_admin(current_user, payload.role)

    target_sector_id = payload.sector_id or current_user.sector_id

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


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Update user data with profile constraints."""
    _require_management_access(current_user)
    _require_can_assign_admin(current_user, payload.role)

    target_user = _get_user_by_id(db, user_id=user_id)

    if payload.name is not None:
        value = payload.name.strip()
        if not value:
            raise HTTPException(status_code=422, detail="Nome invalido.")
        target_user.name = value

    if payload.email is not None:
        value = payload.email.strip().lower()
        if not value:
            raise HTTPException(status_code=422, detail="Email invalido.")
        target_user.email = value

    if payload.role is not None:
        target_user.role = payload.role

    if payload.sector_id is not None:
        sector = db.query(Sector).filter(Sector.id == payload.sector_id).first()
        if not sector:
            raise HTTPException(status_code=404, detail="Setor nao encontrado.")
        target_user.sector_id = payload.sector_id

    if payload.password is not None:
        target_user.password_hash = get_password_hash(payload.password)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email ja cadastrado.") from exc

    db.refresh(target_user)
    return target_user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Delete user with administrator safeguards."""
    _require_management_access(current_user)

    if current_user.id == user_id:
        raise HTTPException(
            status_code=400, detail="Nao e permitido excluir o proprio usuario."
        )

    target_user = _get_user_by_id(db, user_id=user_id)
    db.delete(target_user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
