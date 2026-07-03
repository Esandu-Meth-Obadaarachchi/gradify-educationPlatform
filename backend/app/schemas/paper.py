from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.question import QuestionPart


# --- Paper questions ---


class PaperQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    paper_id: int
    question_id: int
    question_number: int
    marks: int
    part_marks: list[QuestionPart] | None = None
    order_index: int
    # Enriched from the related Question for preview/PDF rendering.
    image_url: str | None = None
    topic_id: int | None = None
    # Original marks from the source paper — reference only, never edited here.
    original_marks: int | None = None
    original_parts: list[QuestionPart] | None = None


class PaperQuestionAdd(BaseModel):
    question_id: int
    marks: int = 0
    part_marks: list[QuestionPart] | None = None
    question_number: int | None = None  # defaults to appended position


class PaperQuestionUpdate(BaseModel):
    question_number: int | None = None
    marks: int | None = Field(None, ge=0)
    part_marks: list[QuestionPart] | None = None


class ReorderRequest(BaseModel):
    # paper_question ids in the desired new order
    ordered_ids: list[int]


# --- Papers ---


class PaperBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subject_id: int
    total_marks: int = 0
    duration_minutes: int = 60
    cover_page_data: dict | None = None


class PaperCreate(PaperBase):
    pass


class PaperUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    subject_id: int | None = None
    total_marks: int | None = None
    duration_minutes: int | None = None
    cover_page_data: dict | None = None


class PaperStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(draft|published)$")


class PaperResponse(PaperBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_at: datetime


class PaperSummary(PaperResponse):
    subject_name: str | None = None
    question_count: int = 0


class PaperDetailResponse(PaperResponse):
    subject_name: str | None = None
    questions: list[PaperQuestionResponse] = []
