from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}


class QuestionBase(BaseModel):
    topic_id: int
    difficulty: str = Field(default="medium")


class QuestionCreate(QuestionBase):
    # image_url is produced server-side after the Cloudinary upload; the create
    # route reads topic_id/difficulty from multipart form fields, not this model.
    image_url: str


class QuestionUpdate(BaseModel):
    topic_id: int | None = None
    difficulty: str | None = None


class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int
    image_url: str
    difficulty: str
    created_at: datetime
