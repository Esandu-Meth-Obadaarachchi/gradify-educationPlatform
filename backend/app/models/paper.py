from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.session import ExamSession
    from app.models.subject import Subject


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id"), nullable=False, index=True
    )
    total_marks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    # draft | published
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    cover_page_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    subject: Mapped["Subject"] = relationship(back_populates="papers")
    questions: Mapped[list["PaperQuestion"]] = relationship(
        back_populates="paper",
        cascade="all, delete-orphan",
        order_by="PaperQuestion.order_index",
    )
    sessions: Mapped[list["ExamSession"]] = relationship(
        back_populates="paper", cascade="all, delete-orphan"
    )


class PaperQuestion(Base):
    __tablename__ = "paper_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(
        ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    marks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    paper: Mapped["Paper"] = relationship(back_populates="questions")
    question: Mapped["Question"] = relationship(back_populates="paper_links")
