from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas import StatsOut
from services.analytics import get_stats_24h
from deps import resolve_device

router = APIRouter()


@router.get("/stats", response_model=StatsOut)
async def get_stats(
    patient_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    device = await resolve_device(db, patient_id)
    stats = await get_stats_24h(db, device.id)
    return stats
