from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Device, Reading
from schemas import ReadingOut
import os

router = APIRouter()

DEMO_DEVICE_KEY = os.getenv("DEMO_DEVICE_KEY", "esp32-dev-key-001")


async def _get_demo_device(db: AsyncSession) -> Device:
    result = await db.execute(select(Device).where(Device.device_key == DEMO_DEVICE_KEY))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=404, detail="Dispositivo demo no encontrado")
    return device


@router.get("/readings/latest", response_model=ReadingOut)
async def get_latest_reading(db: AsyncSession = Depends(get_db)):
    device = await _get_demo_device(db)
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
    db: AsyncSession = Depends(get_db),
):
    device = await _get_demo_device(db)
    query = select(Reading).where(Reading.device_id == device.id)
    if from_time:
        query = query.where(Reading.timestamp >= from_time)
    if to_time:
        query = query.where(Reading.timestamp <= to_time)
    query = query.order_by(Reading.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())
