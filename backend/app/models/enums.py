from enum import Enum


class UserRole(str, Enum):
    """User profile used by authorization rules."""

    AUTOR = "AUTOR"
    COORDENADOR = "COORDENADOR"
    LEITOR = "LEITOR"


class DocumentScope(str, Enum):
    """Document visibility domain."""

    CORPORATE = "CORPORATE"
    LOCAL = "LOCAL"


class DocumentStatus(str, Enum):
    """Controlled lifecycle states for document versions."""

    DRAFT = "DRAFT"
    IN_REVIEW = "IN_REVIEW"
    ACTIVE = "ACTIVE"
    OBSOLETE = "OBSOLETE"


class AuditEventType(str, Enum):
    """Auditable events emitted by business workflows."""

    CREATED = "CREATED"
    STATUS_CHANGED = "STATUS_CHANGED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
