from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.paper import PaperQuestion
    from app.models.topic import Topic


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Image is stored WITHOUT a question number / marks burned in — those live on
    # paper_questions so the same image can be reused across papers.
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    topic: Mapped["Topic"] = relationship(back_populates="questions")
    paper_links: Mapped[list["PaperQuestion"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )
