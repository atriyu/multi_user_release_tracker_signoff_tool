import enum
from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserRole(str, enum.Enum):
    """
    DEPRECATED: This enum is kept for backward compatibility during migration.
    New permission model uses is_admin flag and ProductPermission table.
    """
    ADMIN = "admin"
    PRODUCT_OWNER = "product_owner"
    STAKEHOLDER = "stakeholder"

if TYPE_CHECKING:
    from app.models.release import ReleaseCriteria
    from app.models.signoff import SignOff
    from app.models.audit import AuditLog
    from app.models.release_stakeholder import ReleaseStakeholder
    from app.models.product_permission import ProductPermission


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # DEPRECATED: Kept for backward compatibility during migration
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False), default=UserRole.STAKEHOLDER, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    owned_criteria: Mapped[List["ReleaseCriteria"]] = relationship("ReleaseCriteria", back_populates="owner")
    sign_offs: Mapped[List["SignOff"]] = relationship("SignOff", back_populates="signed_by_user")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="actor")
    assigned_releases: Mapped[List["ReleaseStakeholder"]] = relationship("ReleaseStakeholder", back_populates="user")
    product_permissions: Mapped[List["ProductPermission"]] = relationship("ProductPermission", foreign_keys="ProductPermission.user_id", back_populates="user")

    async def sync_role_from_permissions(self, db=None):
        """
        Automatically sync the deprecated role field based on current permissions.
        This ensures backward compatibility with code still checking user.role.

        Called automatically when user permissions change.
        """
        if self.is_admin:
            self.role = UserRole.ADMIN
        else:
            # Check if product_permissions is loaded or need to query
            if db is not None:
                from sqlalchemy import select
                from app.models.product_permission import ProductPermission
                result = await db.execute(
                    select(ProductPermission).where(ProductPermission.user_id == self.id)
                )
                has_permissions = result.first() is not None
            else:
                # Relationship already loaded
                has_permissions = self.product_permissions and len(self.product_permissions) > 0

            if has_permissions:
                self.role = UserRole.PRODUCT_OWNER
            else:
                self.role = UserRole.STAKEHOLDER

    def has_product_permission(self, product_id: int) -> bool:
        """Check if user has product owner permission for a specific product."""
        if self.is_admin:
            return True
        return any(p.product_id == product_id for p in self.product_permissions)
