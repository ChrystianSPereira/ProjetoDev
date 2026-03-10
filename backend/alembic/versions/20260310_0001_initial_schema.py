"""initial schema

Revision ID: 20260310_0001
Revises:
Create Date: 2026-03-10 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260310_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role_enum = postgresql.ENUM(
        "AUTHOR", "COORDINATOR", "READER", name="user_role", create_type=False
    )
    document_scope_enum = postgresql.ENUM(
        "CORPORATE", "LOCAL", name="document_scope", create_type=False
    )
    document_status_enum = postgresql.ENUM(
        "DRAFT",
        "IN_REVIEW",
        "ACTIVE",
        "OBSOLETE",
        name="document_status",
        create_type=False,
    )
    audit_event_type_enum = postgresql.ENUM(
        "CREATED",
        "STATUS_CHANGED",
        "APPROVED",
        "REJECTED",
        name="audit_event_type",
        create_type=False,
    )

    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    document_scope_enum.create(bind, checkfirst=True)
    document_status_enum.create(bind, checkfirst=True)
    audit_event_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "sectors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_sectors_id"), "sectors", ["id"], unique=False)

    op.create_table(
        "document_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_document_types_id"), "document_types", ["id"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("sector_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["sector_id"], ["sectors.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("scope", document_scope_enum, nullable=False),
        sa.Column("sector_id", sa.Integer(), nullable=False),
        sa.Column("document_type_id", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["document_type_id"], ["document_types.id"]),
        sa.ForeignKeyConstraint(["sector_id"], ["sectors.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sector_id", "code", name="uq_sector_document_code"),
    )
    op.create_index(op.f("ix_documents_code"), "documents", ["code"], unique=False)
    op.create_index(op.f("ix_documents_document_type_id"), "documents", ["document_type_id"], unique=False)
    op.create_index(op.f("ix_documents_id"), "documents", ["id"], unique=False)
    op.create_index(op.f("ix_documents_sector_id"), "documents", ["sector_id"], unique=False)

    op.create_table(
        "document_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("status", document_status_enum, nullable=False),
        sa.Column("file_uri", sa.String(length=500), nullable=False),
        sa.Column("expiration_date", sa.Date(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("approved_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.CheckConstraint("version_number > 0", name="ck_doc_version_number_positive"),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id", "version_number", name="uq_doc_version_number"),
    )
    op.create_index(
        op.f("ix_document_versions_document_id"),
        "document_versions",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_document_versions_expiration_date"),
        "document_versions",
        ["expiration_date"],
        unique=False,
    )
    op.create_index(op.f("ix_document_versions_id"), "document_versions", ["id"], unique=False)
    op.create_index(
        op.f("ix_document_versions_status"), "document_versions", ["status"], unique=False
    )
    op.create_index(
        "uq_doc_single_active",
        "document_versions",
        ["document_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("event_type", audit_event_type_enum, nullable=False),
        sa.Column("previous_status", document_status_enum, nullable=True),
        sa.Column("new_status", document_status_enum, nullable=True),
        sa.Column("actor_user_id", sa.Integer(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_audit_logs_actor_user_id"), "audit_logs", ["actor_user_id"], unique=False
    )
    op.create_index(op.f("ix_audit_logs_entity_id"), "audit_logs", ["entity_id"], unique=False)
    op.create_index(
        op.f("ix_audit_logs_entity_type"), "audit_logs", ["entity_type"], unique=False
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)
    op.create_index(
        op.f("ix_audit_logs_new_status"), "audit_logs", ["new_status"], unique=False
    )
    op.create_index(
        op.f("ix_audit_logs_previous_status"),
        "audit_logs",
        ["previous_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_logs_previous_status"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_new_status"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_entity_type"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_entity_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_actor_user_id"), table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("uq_doc_single_active", table_name="document_versions")
    op.drop_index(op.f("ix_document_versions_status"), table_name="document_versions")
    op.drop_index(op.f("ix_document_versions_id"), table_name="document_versions")
    op.drop_index(op.f("ix_document_versions_expiration_date"), table_name="document_versions")
    op.drop_index(op.f("ix_document_versions_document_id"), table_name="document_versions")
    op.drop_table("document_versions")

    op.drop_index(op.f("ix_documents_sector_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_document_type_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_code"), table_name="documents")
    op.drop_table("documents")

    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    op.drop_index(op.f("ix_document_types_id"), table_name="document_types")
    op.drop_table("document_types")

    op.drop_index(op.f("ix_sectors_id"), table_name="sectors")
    op.drop_table("sectors")

    bind = op.get_bind()
    postgresql.ENUM(name="audit_event_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="document_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="document_scope").drop(bind, checkfirst=True)
    postgresql.ENUM(name="user_role").drop(bind, checkfirst=True)
