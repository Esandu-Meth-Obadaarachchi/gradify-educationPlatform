from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_admin
from app.database import get_db
from app.models.subject import Subject
from app.models.topic import Topic
from app.schemas.topic import TopicCreate, TopicResponse, TopicUpdate

router = APIRouter(prefix="/topics", tags=["topics"])


async def _ensure_subject_exists(db: AsyncSession, subject_id: int) -> None:
    if not await db.get(Subject, subject_id):
        raise HTTPException(status_code=404, detail="Subject not found")


@router.get("", response_model=list[TopicResponse])
async def list_topics(
    subject_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Topic).order_by(Topic.name)
    if subject_id is not None:
        stmt = stmt.where(Topic.subject_id == subject_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    payload: TopicCreate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    await _ensure_subject_exists(db, payload.subject_id)
    topic = Topic(name=payload.name, subject_id=payload.subject_id)
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.put("/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: int,
    payload: TopicUpdate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    topic = await db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if payload.subject_id is not None:
        await _ensure_subject_exists(db, payload.subject_id)
        topic.subject_id = payload.subject_id
    if payload.name is not None:
        topic.name = payload.name
    await db.commit()
    await db.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    topic = await db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    await db.delete(topic)
    await db.commit()
