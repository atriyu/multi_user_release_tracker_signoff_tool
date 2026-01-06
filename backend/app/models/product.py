from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.template import Template
    from app.models.release import Release
    from app.models.product_permission import ProductPermission


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_template_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("templates.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    default_template: Mapped[Optional["Template"]] = relationship("Template")
    releases: Mapped[List["Release"]] = relationship("Release", back_populates="product")
    permissions: Mapped[List["ProductPermission"]] = relationship("ProductPermission", back_populates="product", cascade="all, delete-orphan")
