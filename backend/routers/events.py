from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Device, Event
from schemas import EventOut
import os

router = APIRouter()

DEMO_DEVICE_KEY = os.getenv("DEMO_DEVICE_KEY", "esp32-dev-key-001")


async def _get_demo_device(db: AsyncSession) -> Device:
    result = await db.execute(select(Device).where(Device.device_key == DEMO_DEVICE_KEY))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=404, detail="Dispositivo demo no encontrado")
    return device


@router.get("/events", response_model=list[EventOut])
async def get_events(
    acknowledged: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    device = await _get_demo_device(db)
    query = select(Event).where(Event.device_id == device.id).order_by(Event.detected_at.desc())
    if acknowledged is not None:
        query = query.where(Event.acknowledged == acknowledged)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.patch("/events/{event_id}/acknowledge", response_model=EventOut)
async def acknowledge_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    event.acknowledged = True
    await db.commit()
    await db.refresh(event)
    return event
