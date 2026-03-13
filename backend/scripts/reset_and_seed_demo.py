"""Reset and seed PostgreSQL with realistic demo data for manual tests."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import text
from app.core.security import get_password_hash
from app.database import SessionLocal
from app.models import AuditLog, Document, DocumentScope, DocumentStatus, DocumentType, DocumentVersion, Sector, User, UserRole
from app.models.enums import AuditEventType


def ago(now: datetime, days: int) -> datetime:
    return now - timedelta(days=days)


def in_days(now: datetime, days: int):
    return (now + timedelta(days=days)).date()


def create_user(db, *, name: str, email: str, password: str, role: UserRole, sector_id: int) -> User:
    user = User(
        name=name,
        email=email.lower(),
        password_hash=get_password_hash(password),
        role=role,
        sector_id=sector_id,
    )
    db.add(user)
    db.flush()
    return user


def create_version(
    db,
    *,
    document_id: int,
    version_number: int,
    status: DocumentStatus,
    file_uri: str,
    expiration_date,
    created_by_user_id: int,
    created_at: datetime,
    submitted_at: datetime | None = None,
    approved_at: datetime | None = None,
    approved_by_user_id: int | None = None,
    rejection_reason: str | None = None,
) -> DocumentVersion:
    version = DocumentVersion(
        document_id=document_id,
        version_number=version_number,
        status=status,
        file_uri=file_uri,
        expiration_date=expiration_date,
        created_by_user_id=created_by_user_id,
        approved_by_user_id=approved_by_user_id,
        created_at=created_at,
        submitted_at=submitted_at,
        approved_at=approved_at,
        rejection_reason=rejection_reason,
    )
    db.add(version)
    db.flush()
    return version


def log_event(
    db,
    *,
    version_id: int,
    event_type: AuditEventType,
    actor_user_id: int,
    occurred_at: datetime,
    previous_status: DocumentStatus | None = None,
    new_status: DocumentStatus | None = None,
    payload: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            entity_type="document_version",
            entity_id=version_id,
            event_type=event_type,
            previous_status=previous_status,
            new_status=new_status,
            actor_user_id=actor_user_id,
            occurred_at=occurred_at,
            payload=payload,
        )
    )


def reset_database(db) -> None:
    dialect = db.bind.dialect.name

    if dialect == "postgresql":
        db.execute(
            text(
                """
                TRUNCATE TABLE
                    audit_logs,
                    document_versions,
                    documents,
                    users,
                    document_types,
                    sectors
                RESTART IDENTITY CASCADE
                """
            )
        )
    else:
        for table in [
            "audit_logs",
            "document_versions",
            "documents",
            "users",
            "document_types",
            "sectors",
        ]:
            db.execute(text(f"DELETE FROM {table}"))

    db.commit()


def main() -> None:
    now = datetime.now(UTC)

    db = SessionLocal()
    try:
        reset_database(db)

        sectors = {}
        for sector_name in ["Administracao", "Qualidade", "Farmacia", "Enfermagem"]:
            sector = Sector(name=sector_name)
            db.add(sector)
            db.flush()
            sectors[sector_name] = sector

        dtypes = {}
        for dtype_name in ["POP", "IT", "Manual Operacional", "Formulario", "Politica"]:
            dtype = DocumentType(name=dtype_name)
            db.add(dtype)
            db.flush()
            dtypes[dtype_name] = dtype

        users = {}
        users["admin"] = create_user(
            db,
            name="Administrador",
            email="admin@local.com",
            password="Admin@123",
            role=UserRole.ADMINISTRADOR,
            sector_id=sectors["Administracao"].id,
        )
        users["coord_adm"] = create_user(
            db,
            name="Coordenador Administracao",
            email="coord.adm@local.com",
            password="Coord@123",
            role=UserRole.COORDENADOR,
            sector_id=sectors["Administracao"].id,
        )
        users["coord_qualidade"] = create_user(
            db,
            name="Coordenador Qualidade",
            email="coord.qualidade@local.com",
            password="Coord@123",
            role=UserRole.COORDENADOR,
            sector_id=sectors["Qualidade"].id,
        )
        users["coord_farmacia"] = create_user(
            db,
            name="Coordenador Farmacia",
            email="coord.farmacia@local.com",
            password="Coord@123",
            role=UserRole.COORDENADOR,
            sector_id=sectors["Farmacia"].id,
        )
        users["coord_enfermagem"] = create_user(
            db,
            name="Coordenador Enfermagem",
            email="coord.enfermagem@local.com",
            password="Coord@123",
            role=UserRole.COORDENADOR,
            sector_id=sectors["Enfermagem"].id,
        )
        users["autor_adm"] = create_user(
            db,
            name="Autor Administracao",
            email="autor.adm@local.com",
            password="Autor@123",
            role=UserRole.AUTOR,
            sector_id=sectors["Administracao"].id,
        )
        users["autor_qualidade"] = create_user(
            db,
            name="Autor Qualidade",
            email="autor.qualidade@local.com",
            password="Autor@123",
            role=UserRole.AUTOR,
            sector_id=sectors["Qualidade"].id,
        )
        users["autor_farmacia"] = create_user(
            db,
            name="Autor Farmacia",
            email="autor.farmacia@local.com",
            password="Autor@123",
            role=UserRole.AUTOR,
            sector_id=sectors["Farmacia"].id,
        )
        users["autor_enfermagem"] = create_user(
            db,
            name="Autor Enfermagem",
            email="autor.enfermagem@local.com",
            password="Autor@123",
            role=UserRole.AUTOR,
            sector_id=sectors["Enfermagem"].id,
        )
        users["leitor_adm"] = create_user(
            db,
            name="Leitor Administracao",
            email="leitor.adm@local.com",
            password="Leitor@123",
            role=UserRole.LEITOR,
            sector_id=sectors["Administracao"].id,
        )
        users["leitor_qualidade"] = create_user(
            db,
            name="Leitor Qualidade",
            email="leitor.qualidade@local.com",
            password="Leitor@123",
            role=UserRole.LEITOR,
            sector_id=sectors["Qualidade"].id,
        )
        users["leitor_farmacia"] = create_user(
            db,
            name="Leitor Farmacia",
            email="leitor.farmacia@local.com",
            password="Leitor@123",
            role=UserRole.LEITOR,
            sector_id=sectors["Farmacia"].id,
        )

        # Documento 1: historico completo com v1 obsoleta, v2 vigente e v3 rascunho
        doc1 = Document(
            code="POP-HIG-001",
            title="Higienizacao de Ambientes Criticos",
            scope=DocumentScope.LOCAL,
            sector_id=sectors["Qualidade"].id,
            document_type_id=dtypes["POP"].id,
            created_by_user_id=users["autor_qualidade"].id,
            created_at=ago(now, 125),
        )
        db.add(doc1)
        db.flush()

        v1 = create_version(
            db,
            document_id=doc1.id,
            version_number=1,
            status=DocumentStatus.OBSOLETE,
            file_uri="/uploads/pop-hig-001-v1.pdf",
            expiration_date=in_days(now, -20),
            created_by_user_id=users["autor_qualidade"].id,
            created_at=ago(now, 120),
            submitted_at=ago(now, 118),
            approved_at=ago(now, 117),
            approved_by_user_id=users["coord_qualidade"].id,
        )
        v2 = create_version(
            db,
            document_id=doc1.id,
            version_number=2,
            status=DocumentStatus.ACTIVE,
            file_uri="/uploads/pop-hig-001-v2.pdf",
            expiration_date=in_days(now, 25),
            created_by_user_id=users["autor_qualidade"].id,
            created_at=ago(now, 45),
            submitted_at=ago(now, 44),
            approved_at=ago(now, 43),
            approved_by_user_id=users["coord_qualidade"].id,
        )
        v3 = create_version(
            db,
            document_id=doc1.id,
            version_number=3,
            status=DocumentStatus.DRAFT,
            file_uri="/uploads/pop-hig-001-v3.pdf",
            expiration_date=in_days(now, 180),
            created_by_user_id=users["autor_qualidade"].id,
            created_at=ago(now, 2),
        )

        log_event(db, version_id=v1.id, event_type=AuditEventType.CREATED, actor_user_id=users["autor_qualidade"].id, occurred_at=ago(now, 120), new_status=DocumentStatus.DRAFT)
        log_event(db, version_id=v1.id, event_type=AuditEventType.STATUS_CHANGED, actor_user_id=users["autor_qualidade"].id, occurred_at=ago(now, 118), previous_status=DocumentStatus.DRAFT, new_status=DocumentStatus.IN_REVIEW)
        log_event(db, version_id=v1.id, event_type=AuditEventType.APPROVED, actor_user_id=users["coord_qualidade"].id, occurred_at=ago(now, 117), previous_status=DocumentStatus.IN_REVIEW, new_status=DocumentStatus.ACTIVE)
        log_event(db, version_id=v1.id, event_type=AuditEventType.STATUS_CHANGED, actor_user_id=users["coord_qualidade"].id, occurred_at=ago(now, 43), previous_status=DocumentStatus.ACTIVE, new_status=DocumentStatus.OBSOLETE)

        log_event(db, version_id=v2.id, event_type=AuditEventType.CREATED, actor_user_id=users["autor_qualidade"].id, occurred_at=ago(now, 45), new_status=DocumentStatus.DRAFT)
        log_event(db, version_id=v2.id, event_type=AuditEventType.STATUS_CHANGED, actor_user_id=users["autor_qualidade"].id, occurred_at=ago(now, 44), previous_status=DocumentStatus.DRAFT, new_status=DocumentStatus.IN_REVIEW)
        log_event(db, version_id=v2.id, event_type=AuditEventType.APPROVED, actor_user_id=users["coord_qualidade"].id, occurred_at=ago(now, 43), previous_status=DocumentStatus.IN_REVIEW, new_status=DocumentStatus.ACTIVE)

        log_event(db, version_id=v3.id, event_type=AuditEventType.CREATED, actor_user_id=users["autor_qualidade"].id, occurred_at=ago(now, 2), new_status=DocumentStatus.DRAFT)

        # Documento 2: corporativo vigente
        doc2 = Document(
            code="IT-SGI-002",
            title="Instrucao de Controle de Mudancas",
            scope=DocumentScope.CORPORATE,
            sector_id=sectors["Qualidade"].id,
            document_type_id=dtypes["IT"].id,
            created_by_user_id=users["autor_qualidade"].id,
            created_at=ago(now, 75),
        )
        db.add(doc2)
        db.flush()

        d2v1 = create_version(
            db,
            document_id=doc2.id,
            version_number=1,
            status=DocumentStatus.ACTIVE,
            file_uri="/uploads/it-sgi-002-v1.pdf",
            expiration_date=in_days(now, 90),
            created_by_user_id=users["autor_qualidade"].id,
            created_at=ago(now, 70),
            submitted_at=ago(now, 69),
            approved_at=ago(now, 68),
            approved_by_user_id=users["coord_qualidade"].id,
        )
        log_event(db, version_id=d2v1.id, event_type=AuditEventType.CREATED, actor_user_id=users["autor_qualidade"].id, occurred_at=ago(now, 70), new_status=DocumentStatus.DRAFT)
        log_event(db, version_id=d2v1.id, event_type=AuditEventType.STATUS_CHANGED, actor_user_id=users["autor_qualidade"].id, occurred_at=ago(now, 69), previous_status=DocumentStatus.DRAFT, new_status=DocumentStatus.IN_REVIEW)
        log_event(db, version_id=d2v1.id, event_type=AuditEventType.APPROVED, actor_user_id=users["coord_qualidade"].id, occurred_at=ago(now, 68), previous_status=DocumentStatus.IN_REVIEW, new_status=DocumentStatus.ACTIVE)

        # Documento 3: farmacia com versao em revisao
        doc3 = Document(
            code="FAR-POP-010",
            title="Dispensacao Segura de Medicamentos",
            scope=DocumentScope.LOCAL,
            sector_id=sectors["Farmacia"].id,
            document_type_id=dtypes["POP"].id,
            created_by_user_id=users["autor_farmacia"].id,
            created_at=ago(now, 42),
        )
        db.add(doc3)
        db.flush()

        d3v1 = create_version(
            db,
            document_id=doc3.id,
            version_number=1,
            status=DocumentStatus.ACTIVE,
            file_uri="/uploads/far-pop-010-v1.pdf",
            expiration_date=in_days(now, 12),
            created_by_user_id=users["autor_farmacia"].id,
            created_at=ago(now, 40),
            submitted_at=ago(now, 39),
            approved_at=ago(now, 38),
            approved_by_user_id=users["coord_farmacia"].id,
        )
        d3v2 = create_version(
            db,
            document_id=doc3.id,
            version_number=2,
            status=DocumentStatus.IN_REVIEW,
            file_uri="/uploads/far-pop-010-v2.pdf",
            expiration_date=in_days(now, 365),
            created_by_user_id=users["autor_farmacia"].id,
            created_at=ago(now, 3),
            submitted_at=ago(now, 2),
        )
        log_event(db, version_id=d3v1.id, event_type=AuditEventType.CREATED, actor_user_id=users["autor_farmacia"].id, occurred_at=ago(now, 40), new_status=DocumentStatus.DRAFT)
        log_event(db, version_id=d3v1.id, event_type=AuditEventType.STATUS_CHANGED, actor_user_id=users["autor_farmacia"].id, occurred_at=ago(now, 39), previous_status=DocumentStatus.DRAFT, new_status=DocumentStatus.IN_REVIEW)
        log_event(db, version_id=d3v1.id, event_type=AuditEventType.APPROVED, actor_user_id=users["coord_farmacia"].id, occurred_at=ago(now, 38), previous_status=DocumentStatus.IN_REVIEW, new_status=DocumentStatus.ACTIVE)

        log_event(db, version_id=d3v2.id, event_type=AuditEventType.CREATED, actor_user_id=users["autor_farmacia"].id, occurred_at=ago(now, 3), new_status=DocumentStatus.DRAFT)
        log_event(db, version_id=d3v2.id, event_type=AuditEventType.STATUS_CHANGED, actor_user_id=users["autor_farmacia"].id, occurred_at=ago(now, 2), previous_status=DocumentStatus.DRAFT, new_status=DocumentStatus.IN_REVIEW)

        # Documento 4: vencido
        doc4 = Document(
            code="ENF-FOR-003",
            title="Checklist de Passagem de Plantao",
            scope=DocumentScope.LOCAL,
            sector_id=sectors["Enfermagem"].id,
            document_type_id=dtypes["Formulario"].id,
            created_by_user_id=users["autor_enfermagem"].id,
            created_at=ago(now, 82),
        )
        db.add(doc4)
        db.flush()

        d4v1 = create_version(
            db,
            document_id=doc4.id,
            version_number=1,
            status=DocumentStatus.ACTIVE,
            file_uri="/uploads/enf-for-003-v1.pdf",
            expiration_date=in_days(now, -5),
            created_by_user_id=users["autor_enfermagem"].id,
            created_at=ago(now, 80),
            submitted_at=ago(now, 79),
            approved_at=ago(now, 78),
            approved_by_user_id=users["coord_enfermagem"].id,
        )
        log_event(db, version_id=d4v1.id, event_type=AuditEventType.CREATED, actor_user_id=users["autor_enfermagem"].id, occurred_at=ago(now, 80), new_status=DocumentStatus.DRAFT)
        log_event(db, version_id=d4v1.id, event_type=AuditEventType.STATUS_CHANGED, actor_user_id=users["autor_enfermagem"].id, occurred_at=ago(now, 79), previous_status=DocumentStatus.DRAFT, new_status=DocumentStatus.IN_REVIEW)
        log_event(db, version_id=d4v1.id, event_type=AuditEventType.APPROVED, actor_user_id=users["coord_enfermagem"].id, occurred_at=ago(now, 78), previous_status=DocumentStatus.IN_REVIEW, new_status=DocumentStatus.ACTIVE)

        # Documento 5: corporativo da administracao
        doc5 = Document(
            code="ADM-POL-001",
            title="Politica Corporativa de Gestao Documental",
            scope=DocumentScope.CORPORATE,
            sector_id=sectors["Administracao"].id,
            document_type_id=dtypes["Politica"].id,
            created_by_user_id=users["autor_adm"].id,
            created_at=ago(now, 155),
        )
        db.add(doc5)
        db.flush()

        d5v1 = create_version(
            db,
            document_id=doc5.id,
            version_number=1,
            status=DocumentStatus.ACTIVE,
            file_uri="/uploads/adm-pol-001-v1.pdf",
            expiration_date=in_days(now, 300),
            created_by_user_id=users["autor_adm"].id,
            created_at=ago(now, 150),
            submitted_at=ago(now, 149),
            approved_at=ago(now, 148),
            approved_by_user_id=users["coord_adm"].id,
        )
        log_event(db, version_id=d5v1.id, event_type=AuditEventType.CREATED, actor_user_id=users["autor_adm"].id, occurred_at=ago(now, 150), new_status=DocumentStatus.DRAFT)
        log_event(db, version_id=d5v1.id, event_type=AuditEventType.STATUS_CHANGED, actor_user_id=users["autor_adm"].id, occurred_at=ago(now, 149), previous_status=DocumentStatus.DRAFT, new_status=DocumentStatus.IN_REVIEW)
        log_event(db, version_id=d5v1.id, event_type=AuditEventType.APPROVED, actor_user_id=users["coord_adm"].id, occurred_at=ago(now, 148), previous_status=DocumentStatus.IN_REVIEW, new_status=DocumentStatus.ACTIVE)

        # Documento 6: rascunho devolvido (reprovado)
        doc6 = Document(
            code="ENF-IT-011",
            title="Instrucao de Identificacao Segura do Paciente",
            scope=DocumentScope.LOCAL,
            sector_id=sectors["Enfermagem"].id,
            document_type_id=dtypes["IT"].id,
            created_by_user_id=users["autor_enfermagem"].id,
            created_at=ago(now, 7),
        )
        db.add(doc6)
        db.flush()

        d6v1 = create_version(
            db,
            document_id=doc6.id,
            version_number=1,
            status=DocumentStatus.DRAFT,
            file_uri="/uploads/enf-it-011-v1.pdf",
            expiration_date=in_days(now, 200),
            created_by_user_id=users["autor_enfermagem"].id,
            created_at=ago(now, 6),
            submitted_at=ago(now, 5),
            rejection_reason="Ajustar referencias normativas e campo de assinatura.",
        )
        log_event(db, version_id=d6v1.id, event_type=AuditEventType.CREATED, actor_user_id=users["autor_enfermagem"].id, occurred_at=ago(now, 6), new_status=DocumentStatus.DRAFT)
        log_event(db, version_id=d6v1.id, event_type=AuditEventType.STATUS_CHANGED, actor_user_id=users["autor_enfermagem"].id, occurred_at=ago(now, 5), previous_status=DocumentStatus.DRAFT, new_status=DocumentStatus.IN_REVIEW)
        log_event(
            db,
            version_id=d6v1.id,
            event_type=AuditEventType.REJECTED,
            actor_user_id=users["coord_enfermagem"].id,
            occurred_at=ago(now, 4),
            previous_status=DocumentStatus.IN_REVIEW,
            new_status=DocumentStatus.DRAFT,
            payload={"reason": "Ajustar referencias normativas e campo de assinatura."},
        )

        db.commit()

        users_count = db.query(User).count()
        documents_count = db.query(Document).count()
        versions_count = db.query(DocumentVersion).count()
        audits_count = db.query(AuditLog).count()

        print("[OK] Banco limpo e populado com dados de teste realistas.")
        print(f"Usuarios: {users_count} | Documentos: {documents_count} | Versoes: {versions_count} | Auditorias: {audits_count}")
        print("\nCredenciais principais para teste:")
        print("- ADMINISTRADOR: admin@local.com / Admin@123")
        print("- COORDENADOR (Qualidade): coord.qualidade@local.com / Coord@123")
        print("- AUTOR (Qualidade): autor.qualidade@local.com / Autor@123")
        print("- LEITOR (Qualidade): leitor.qualidade@local.com / Leitor@123")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

