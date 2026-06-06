from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TopicBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    subject_id: int


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    subject_id: int | None = None


class TopicResponse(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
