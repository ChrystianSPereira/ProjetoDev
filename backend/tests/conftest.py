import os
import sys
from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-123456")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("DATABASE_URL", "sqlite:///./.test_bootstrap.db")

from app.core.security import get_password_hash
from app.database import Base, get_db
from app.main import app
from app.models import DocumentType, Sector, User
from app.models.enums import UserRole


@pytest.fixture(scope="session")
def engine():
    db_path = Path(__file__).resolve().parent / "test.db"
    if db_path.exists():
        db_path.unlink()

    engine_ = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine_)
    yield engine_
    Base.metadata.drop_all(bind=engine_)
    engine_.dispose()
    if db_path.exists():
        db_path.unlink()


@pytest.fixture()
def db_session(engine) -> Session:
    testing_session_local = sessionmaker(
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        bind=engine,
    )
    session = testing_session_local()

    for model in [User, DocumentType, Sector]:
        session.query(model).delete()
    session.commit()

    yield session

    session.close()


@pytest.fixture()
def seeded_db(db_session: Session) -> dict:
    sector_a = Sector(name="Setor A")
    sector_b = Sector(name="Setor B")
    db_session.add_all([sector_a, sector_b])
    db_session.flush()

    doc_type = DocumentType(name="POP")
    db_session.add(doc_type)
    db_session.flush()

    coordinator_a = User(
        name="Coordenador A",
        email="coord.a@local.com",
        password_hash=get_password_hash("123456"),
        role=UserRole.COORDENADOR,
        sector_id=sector_a.id,
    )
    coordinator_b = User(
        name="Coordenador B",
        email="coord.b@local.com",
        password_hash=get_password_hash("123456"),
        role=UserRole.COORDENADOR,
        sector_id=sector_b.id,
    )
    author_a = User(
        name="Autor A",
        email="autor.a@local.com",
        password_hash=get_password_hash("123456"),
        role=UserRole.AUTOR,
        sector_id=sector_a.id,
    )
    author_b = User(
        name="Autor B",
        email="autor.b@local.com",
        password_hash=get_password_hash("123456"),
        role=UserRole.AUTOR,
        sector_id=sector_b.id,
    )
    reader_b = User(
        name="Leitor B",
        email="leitor.b@local.com",
        password_hash=get_password_hash("123456"),
        role=UserRole.LEITOR,
        sector_id=sector_b.id,
    )
    admin = User(
        name="Administrador",
        email="admin@local.com",
        password_hash=get_password_hash("123456"),
        role=UserRole.ADMINISTRADOR,
        sector_id=sector_a.id,
    )

    db_session.add_all([coordinator_a, coordinator_b, author_a, author_b, reader_b, admin])
    db_session.commit()

    return {
        "sector_a": sector_a,
        "sector_b": sector_b,
        "doc_type": doc_type,
        "coordinator_a": coordinator_a,
        "coordinator_b": coordinator_b,
        "author_a": author_a,
        "author_b": author_b,
        "reader_b": reader_b,
        "admin": admin,
        "default_expiration": date(2030, 1, 1).isoformat(),
    }


@pytest.fixture()
def client(db_session: Session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def login_headers(client: TestClient, email: str, password: str = "123456") -> dict:
    response = client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
