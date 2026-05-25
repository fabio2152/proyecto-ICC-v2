from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Device
from schemas import StatsOut
from services.analytics import get_stats_24h
import os

router = APIRouter()

DEMO_DEVICE_KEY = os.getenv("DEMO_DEVICE_KEY", "esp32-dev-key-001")


@router.get("/stats", response_model=StatsOut)
async def get_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.device_key == DEMO_DEVICE_KEY))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=404, detail="Dispositivo demo no encontrado")
    stats = await get_stats_24h(db, device.id)
    return stats
