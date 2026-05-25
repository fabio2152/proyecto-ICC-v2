from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from models import Reading, Device
import os

DEMO_DEVICE_KEY = os.getenv("DEMO_DEVICE_KEY", "esp32-dev-key-001")


async def get_stats_24h(db: AsyncSession, device_id: int) -> dict:
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
    result = await db.execute(
        select(
            func.avg(Reading.heart_rate),
            func.min(Reading.heart_rate),
            func.max(Reading.heart_rate),
            func.avg(Reading.spo2),
            func.min(Reading.spo2),
            func.max(Reading.spo2),
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
