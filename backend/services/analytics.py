from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from models import Reading, Device
import os

DEMO_DEVICE_KEY = os.getenv("DEMO_DEVICE_KEY", "esp32-dev-key-001")


async def get_stats_24h(db: AsyncSession, device_id: int) -> dict:
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)

    # Las lecturas con valor 0 son "sensor sin contacto" (el MAX30102 no captó
    # dedo/muñeca), no valores reales. Las convertimos a NULL con CASE para que
    # avg/min/max las ignoren y no ensucien el resumen (ej: FC mínima = 0).
    hr = case((Reading.heart_rate > 0, Reading.heart_rate))
    spo2 = case((Reading.spo2 > 0, Reading.spo2))
    result = await db.execute(
        select(
            func.avg(hr),
            func.min(hr),
            func.max(hr),
            func.avg(spo2),
            func.min(spo2),
            func.max(spo2),
        ).where(Reading.device_id == device_id, Reading.timestamp >= since)
    )
    row = result.one()
    return {
        "avg_hr": row[0],
        "min_hr": row[1],
        "max_hr": row[2],
        "avg_spo2": row[3],
        "min_spo2": row[4],
        "max_spo2": row[5],
    }
