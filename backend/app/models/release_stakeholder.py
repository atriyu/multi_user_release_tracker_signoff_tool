from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.release import Release
    from app.models.user import User


class ReleaseStakeholder(Base):
    __tablename__ = "release_stakeholders"
    __table_args__ = (
        UniqueConstraint('release_id', 'user_id', name='uq_release_user'),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    release_id: Mapped[int] = mapped_column(ForeignKey("releases.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    release: Mapped["Release"] = relationship("Release", back_populates="stakeholders")
    user: Mapped["User"] = relationship("User", back_populates="assigned_releases")
