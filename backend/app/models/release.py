from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from enum import Enum as PyEnum
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, Date, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.template import Template
    from app.models.user import User
    from app.models.signoff import SignOff
    from app.models.release_stakeholder import ReleaseStakeholder


class ReleaseStatus(str, PyEnum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    RELEASED = "released"
    CANCELLED = "cancelled"


class CriteriaStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    BLOCKED = "blocked"


class Release(Base):
    __tablename__ = "releases"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    template_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("templates.id"), nullable=True
    )
    version: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ReleaseStatus] = mapped_column(
        Enum(ReleaseStatus, native_enum=False), default=ReleaseStatus.DRAFT
    )
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    released_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    is_deleted: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="releases")
    template: Mapped[Optional["Template"]] = relationship("Template")
    created_by: Mapped[Optional["User"]] = relationship("User")
    criteria: Mapped[List["ReleaseCriteria"]] = relationship(
        "ReleaseCriteria", back_populates="release", cascade="all, delete-orphan"
    )
    stakeholders: Mapped[List["ReleaseStakeholder"]] = relationship(
        "ReleaseStakeholder", back_populates="release", cascade="all, delete-orphan"
    )


class ReleaseCriteria(Base):
    __tablename__ = "release_criteria"

    id: Mapped[int] = mapped_column(primary_key=True)
    release_id: Mapped[int] = mapped_column(ForeignKey("releases.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(default=True)
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[CriteriaStatus] = mapped_column(
        Enum(CriteriaStatus, native_enum=False), default=CriteriaStatus.PENDING
    )
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    release: Mapped["Release"] = relationship("Release", back_populates="criteria")
    owner: Mapped[Optional["User"]] = relationship("User", back_populates="owned_criteria")
    sign_offs: Mapped[List["SignOff"]] = relationship(
        "SignOff", back_populates="criteria", cascade="all, delete-orphan"
    )
