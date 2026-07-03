from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_admin
from app.database import get_db
from app.models.question import Question
from app.models.topic import Topic
from app.schemas.question import (
    ALLOWED_DIFFICULTIES,
    QuestionResponse,
    QuestionUpdate,
)
from app.services.gcs_service import StorageNotConfigured, upload_image

router = APIRouter(prefix="/questions", tags=["questions"])

_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}

# Sub-part labels a, b, c, ... for a comma marks string like "3,1,2".
_PART_LABELS = "abcdefghijklmnopqrstuvwxyz"


def _parse_marks(raw: str | None) -> tuple[int | None, list[dict] | None]:
    """Turn a comma marks string into (original_marks, parts).

    "3,1,2" -> (6, [{"label": "a", "marks": 3}, ...]).
    "5"     -> (5, None)  — single number, no sub-parts.
    ""/None -> (None, None).
    """
    if raw is None or not raw.strip():
        return None, None
    try:
        values = [int(v.strip()) for v in raw.split(",") if v.strip()]
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="Marks must be numbers separated by commas, e.g. 3,1,2",
        )
    if any(v < 0 for v in values):
        raise HTTPException(status_code=422, detail="Marks cannot be negative")
    if not values:
        return None, None
    if len(values) == 1:
        return values[0], None
    if len(values) > len(_PART_LABELS):
        raise HTTPException(status_code=422, detail="Too many sub-parts")
    parts = [{"label": _PART_LABELS[i], "marks": v} for i, v in enumerate(values)]
    return sum(values), parts


@router.get("", response_model=list[QuestionResponse])
async def list_questions(
    subject_id: int | None = None,
    topic_id: int | None = None,
    difficulty: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Question)
    if topic_id is not None:
        stmt = stmt.where(Question.topic_id == topic_id)
    if subject_id is not None:
        stmt = stmt.join(Topic).where(Topic.subject_id == subject_id)
    if difficulty is not None:
        stmt = stmt.where(Question.difficulty == difficulty)
    stmt = stmt.order_by(Question.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    topic_id: int = Form(...),
    difficulty: str = Form("medium"),
    marks: str | None = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    if difficulty not in ALLOWED_DIFFICULTIES:
        raise HTTPException(
            status_code=422,
            detail=f"difficulty must be one of {sorted(ALLOWED_DIFFICULTIES)}",
        )
    if not await db.get(Topic, topic_id):
        raise HTTPException(status_code=404, detail="Topic not found")
    if file.content_type not in _IMAGE_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{file.content_type}'. Upload a PNG/JPEG/WebP image.",
        )

    original_marks, parts = _parse_marks(marks)

    contents = await file.read()
    try:
        image_url = upload_image(contents, file.content_type)
    except StorageNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    question = Question(
        topic_id=topic_id,
        difficulty=difficulty,
        image_url=image_url,
        original_marks=original_marks,
        parts=parts,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    payload: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if payload.difficulty is not None:
        if payload.difficulty not in ALLOWED_DIFFICULTIES:
            raise HTTPException(
                status_code=422,
                detail=f"difficulty must be one of {sorted(ALLOWED_DIFFICULTIES)}",
            )
        question.difficulty = payload.difficulty
    if payload.topic_id is not None:
        if not await db.get(Topic, payload.topic_id):
            raise HTTPException(status_code=404, detail="Topic not found")
        question.topic_id = payload.topic_id
    fields = payload.model_dump(exclude_unset=True)
    if "parts" in fields:
        question.parts = (
            [p.model_dump() for p in payload.parts] if payload.parts else None
        )
    if "original_marks" in fields:
        question.original_marks = payload.original_marks
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.delete(question)
    await db.commit()
