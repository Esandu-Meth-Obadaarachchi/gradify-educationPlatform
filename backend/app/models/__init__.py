"""Import all models here so they register on Base.metadata.

Alembic autogenerate and SQLAlchemy relationship resolution both rely on every
model being imported. Import this package (``import app.models``) before
creating tables or running migrations.
"""

from app.models.paper import Paper, PaperQuestion
from app.models.question import Question
from app.models.session import ExamSession
from app.models.subject import Subject
from app.models.topic import Topic

__all__ = [
    "Subject",
    "Topic",
    "Question",
    "Paper",
    "PaperQuestion",
    "ExamSession",
]
