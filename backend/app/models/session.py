import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.paper import Paper


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(
        ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_name: Mapped[str] = mapped_column(String(150), nullable=False)
    student_email: Mapped[str] = mapped_column(String(255), nullable=False)
    # The UUID link IS the student's auth — no login required.
    access_token: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        default=uuid.uuid4,
        unique=True,
        index=True,
        nullable=False,
    )
    # pending | in_progress | grace_period | submitted | marking | marked
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    submission_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    marked_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    marks_awarded: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    paper: Mapped["Paper"] = relationship(back_populates="sessions")
