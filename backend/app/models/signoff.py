from datetime import datetime
from typing import Optional, TYPE_CHECKING
from enum import Enum as PyEnum
from sqlalchemy import Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.release import ReleaseCriteria
    from app.models.user import User


class SignOffStatus(str, PyEnum):
    APPROVED = "approved"
    REJECTED = "rejected"
    REVOKED = "revoked"


class SignOff(Base):
    __tablename__ = "sign_offs"

    id: Mapped[int] = mapped_column(primary_key=True)
    criteria_id: Mapped[int] = mapped_column(ForeignKey("release_criteria.id"), index=True)
    signed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[SignOffStatus] = mapped_column(Enum(SignOffStatus, native_enum=False))
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    link: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    criteria: Mapped["ReleaseCriteria"] = relationship("ReleaseCriteria", back_populates="sign_offs")
    signed_by_user: Mapped["User"] = relationship("User", back_populates="sign_offs")
