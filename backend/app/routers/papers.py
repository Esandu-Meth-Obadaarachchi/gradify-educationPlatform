from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_admin
from app.database import get_db
from app.models.paper import Paper, PaperQuestion
from app.models.question import Question
from app.models.subject import Subject
from app.schemas.paper import (
    PaperCreate,
    PaperDetailResponse,
    PaperQuestionAdd,
    PaperQuestionResponse,
    PaperQuestionUpdate,
    PaperResponse,
    PaperStatusUpdate,
    PaperSummary,
    PaperUpdate,
    ReorderRequest,
)

router = APIRouter(prefix="/papers", tags=["papers"])


def _pq_response(pq: PaperQuestion) -> PaperQuestionResponse:
    return PaperQuestionResponse(
        id=pq.id,
        paper_id=pq.paper_id,
        question_id=pq.question_id,
        question_number=pq.question_number,
        marks=pq.marks,
        part_marks=pq.part_marks,
        order_index=pq.order_index,
        image_url=pq.question.image_url if pq.question else None,
        topic_id=pq.question.topic_id if pq.question else None,
        original_marks=pq.question.original_marks if pq.question else None,
        original_parts=pq.question.parts if pq.question else None,
    )


async def _load_paper(db: AsyncSession, paper_id: int) -> Paper:
    paper = await db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


async def _paper_questions(db: AsyncSession, paper_id: int) -> list[PaperQuestion]:
    """Always a fresh SELECT (avoids stale identity-map collections)."""
    rows = await db.execute(
        select(PaperQuestion)
        .where(PaperQuestion.paper_id == paper_id)
        .options(selectinload(PaperQuestion.question))
        .order_by(PaperQuestion.order_index)
    )
    return list(rows.scalars().all())


async def _detail(db: AsyncSession, paper: Paper) -> PaperDetailResponse:
    subject = await db.get(Subject, paper.subject_id)
    pqs = await _paper_questions(db, paper.id)
    return PaperDetailResponse(
        id=paper.id,
        title=paper.title,
        subject_id=paper.subject_id,
        total_marks=paper.total_marks,
        duration_minutes=paper.duration_minutes,
        cover_page_data=paper.cover_page_data,
        status=paper.status,
        created_at=paper.created_at,
        subject_name=subject.name if subject else None,
        questions=[_pq_response(pq) for pq in pqs],
    )


@router.get("", response_model=list[PaperSummary])
async def list_papers(db: AsyncSession = Depends(get_db)):
    papers = (
        await db.execute(select(Paper).order_by(Paper.created_at.desc()))
    ).scalars().all()
    subjects = {
        s.id: s.name for s in (await db.execute(select(Subject))).scalars().all()
    }
    count_rows = await db.execute(
        select(PaperQuestion.paper_id, func.count(PaperQuestion.id)).group_by(
            PaperQuestion.paper_id
        )
    )
    counts = {pid: c for pid, c in count_rows.all()}
    return [
        PaperSummary(
            id=p.id,
            title=p.title,
            subject_id=p.subject_id,
            total_marks=p.total_marks,
            duration_minutes=p.duration_minutes,
            cover_page_data=p.cover_page_data,
            status=p.status,
            created_at=p.created_at,
            subject_name=subjects.get(p.subject_id),
            question_count=counts.get(p.id, 0),
        )
        for p in papers
    ]


@router.post("", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def create_paper(
    payload: PaperCreate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    if not await db.get(Subject, payload.subject_id):
        raise HTTPException(status_code=404, detail="Subject not found")
    paper = Paper(**payload.model_dump())
    db.add(paper)
    await db.commit()
    await db.refresh(paper)
    return paper


@router.get("/{paper_id}", response_model=PaperDetailResponse)
async def get_paper(paper_id: int, db: AsyncSession = Depends(get_db)):
    paper = await _load_paper(db, paper_id)
    return await _detail(db, paper)


@router.put("/{paper_id}", response_model=PaperDetailResponse)
async def update_paper(
    paper_id: int,
    payload: PaperUpdate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    paper = await _load_paper(db, paper_id)
    data = payload.model_dump(exclude_unset=True)
    if "subject_id" in data and not await db.get(Subject, data["subject_id"]):
        raise HTTPException(status_code=404, detail="Subject not found")
    for key, value in data.items():
        setattr(paper, key, value)
    await db.commit()
    await db.refresh(paper)
    return await _detail(db, paper)


@router.patch("/{paper_id}/status", response_model=PaperResponse)
async def update_status(
    paper_id: int,
    payload: PaperStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    paper = await _load_paper(db, paper_id)
    paper.status = payload.status
    await db.commit()
    await db.refresh(paper)
    return paper


@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_paper(
    paper_id: int,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    paper = await _load_paper(db, paper_id)
    await db.delete(paper)
    await db.commit()


# --- Paper questions ---


@router.post(
    "/{paper_id}/questions",
    response_model=PaperDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_question(
    paper_id: int,
    payload: PaperQuestionAdd,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    paper = await _load_paper(db, paper_id)
    question = await db.get(Question, payload.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    existing = await _paper_questions(db, paper_id)
    next_order = max((pq.order_index for pq in existing), default=-1) + 1
    number = (
        payload.question_number
        if payload.question_number is not None
        else len(existing) + 1
    )
    # Seed the adjusted marks from the question's original breakdown so the admin
    # starts at the paper's real values and only nudges them to hit the total.
    if payload.part_marks is not None:
        part_marks = [p.model_dump() for p in payload.part_marks]
    elif question.parts:
        part_marks = [dict(p) for p in question.parts]
    else:
        part_marks = None
    if part_marks is not None:
        marks = sum(p["marks"] for p in part_marks)
    elif payload.marks:
        marks = payload.marks
    else:
        marks = question.original_marks or 0
    db.add(
        PaperQuestion(
            paper_id=paper_id,
            question_id=payload.question_id,
            marks=marks,
            part_marks=part_marks,
            question_number=number,
            order_index=next_order,
        )
    )
    await db.commit()
    return await _detail(db, paper)


# NOTE: /reorder must be declared before /{pq_id} so it isn't captured as an id.
@router.put("/{paper_id}/questions/reorder", response_model=PaperDetailResponse)
async def reorder_questions(
    paper_id: int,
    payload: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    paper = await _load_paper(db, paper_id)
    existing = await _paper_questions(db, paper_id)
    by_id = {pq.id: pq for pq in existing}
    for index, pq_id in enumerate(payload.ordered_ids):
        pq = by_id.get(pq_id)
        if pq is not None:
            pq.order_index = index
    await db.commit()
    return await _detail(db, paper)


@router.put("/{paper_id}/questions/{pq_id}", response_model=PaperDetailResponse)
async def update_paper_question(
    paper_id: int,
    pq_id: int,
    payload: PaperQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    pq = await db.get(PaperQuestion, pq_id)
    if not pq or pq.paper_id != paper_id:
        raise HTTPException(status_code=404, detail="Paper question not found")
    data = payload.model_dump(exclude_unset=True)
    if "part_marks" in data and data["part_marks"] is not None:
        # Keep the question total as the sum of its parts.
        data["marks"] = sum(p["marks"] for p in data["part_marks"])
    for key, value in data.items():
        setattr(pq, key, value)
    await db.commit()
    paper = await _load_paper(db, paper_id)
    return await _detail(db, paper)


@router.delete("/{paper_id}/questions/{pq_id}", response_model=PaperDetailResponse)
async def remove_paper_question(
    paper_id: int,
    pq_id: int,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    pq = await db.get(PaperQuestion, pq_id)
    if not pq or pq.paper_id != paper_id:
        raise HTTPException(status_code=404, detail="Paper question not found")
    await db.delete(pq)
    await db.commit()
    paper = await _load_paper(db, paper_id)
    return await _detail(db, paper)


# --- PDF export ---


@router.get("/{paper_id}/export")
async def export_paper(
    paper_id: int,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    paper = await _load_paper(db, paper_id)
    detail = await _detail(db, paper)
    try:
        from app.services.pdf_service import render_paper_pdf
    except Exception as exc:  # WeasyPrint / native libs not available
        raise HTTPException(status_code=503, detail=f"PDF service unavailable: {exc}")
    pdf_bytes = render_paper_pdf(detail)
    safe_title = "".join(
        c if c.isalnum() or c in "-_ " else "_" for c in detail.title
    ).strip()
    filename = f"{safe_title or 'paper'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
