from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class ProductPermission(Base):
    """
    Product-level permissions for users.

    Grants users the ability to manage releases and assign stakeholders
    for a specific product. Multiple users can have product_owner permission
    for the same product.
    """
    __tablename__ = "product_permissions"
    __table_args__ = (
        UniqueConstraint('product_id', 'user_id', name='uq_product_user'),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission_type: Mapped[str] = mapped_column(String(50), default="product_owner", nullable=False)
    granted_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    granted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="permissions")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="product_permissions")
    granted_by: Mapped["User"] = relationship("User", foreign_keys=[granted_by_id])
