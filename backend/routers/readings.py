from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Reading
from schemas import ReadingOut
from deps import resolve_device

router = APIRouter()


@router.get("/readings/latest", response_model=ReadingOut)
async def get_latest_reading(
    patient_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    device = await resolve_device(db, patient_id)
    result = await db.execute(
        select(Reading)
        .where(Reading.device_id == device.id)
        .order_by(Reading.timestamp.desc())
        .limit(1)
    )
    reading = result.scalar_one_or_none()
    if reading is None:
        raise HTTPException(status_code=404, detail="Sin lecturas disponibles")
    return reading


@router.get("/readings", response_model=list[ReadingOut])
async def get_readings(
    from_time: datetime | None = Query(None, alias="from"),
    to_time: datetime | None = Query(None, alias="to"),
    limit: int = Query(200, le=1000),
    patient_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    device = await resolve_device(db, patient_id)
    query = select(Reading).where(Reading.device_id == device.id)
    if from_time:
        query = query.where(Reading.timestamp >= from_time)
    if to_time:
        query = query.where(Reading.timestamp <= to_time)
    query = query.order_by(Reading.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())
