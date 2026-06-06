import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ExamSessionBase(BaseModel):
    paper_id: int
    student_name: str = Field(..., min_length=1, max_length=150)
    student_email: EmailStr


class ExamSessionCreate(ExamSessionBase):
    pass


class ExamSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    paper_id: int
    student_name: str
    student_email: str
    access_token: uuid.UUID
    status: str
    started_at: datetime | None = None
    ended_at: datetime | None = None
    submission_url: str | None = None
    marked_url: str | None = None
    marks_awarded: int | None = None
    feedback: dict | None = None
    created_at: datetime
