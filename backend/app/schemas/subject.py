from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SubjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)


class SubjectResponse(SubjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
