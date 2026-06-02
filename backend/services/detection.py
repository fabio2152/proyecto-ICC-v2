from math import sqrt
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Reading, Event
import os

LOW_SPO2_THRESHOLD = float(os.getenv("LOW_SPO2_THRESHOLD", "92"))
LOW_SPO2_CONSECUTIVE = int(os.getenv("LOW_SPO2_CONSECUTIVE", "12"))
TACHYCARDIA_BPM = float(os.getenv("TACHYCARDIA_BPM", "100"))
TACHYCARDIA_CONSECUTIVE = int(os.getenv("TACHYCARDIA_CONSECUTIVE", "24"))
BRADYCARDIA_BPM = float(os.getenv("BRADYCARDIA_BPM", "50"))
BRADYCARDIA_CONSECUTIVE = int(os.getenv("BRADYCARDIA_CONSECUTIVE", "24"))


def classify_activity(accel_x: float, accel_y: float, accel_z: float) -> str:
    magnitude = sqrt(accel_x**2 + accel_y**2 + accel_z**2)
    if magnitude < 1.05:
        return "rest"
    elif magnitude < 1.5:
        return "walking"
    return "running"


async def _has_active_event(db: AsyncSession, device_id: int, event_type: str) -> bool:
    result = await db.execute(
        select(Event).where(
            Event.device_id == device_id,
            Event.type == event_type,
            Event.acknowledged == False,
        )
    )
    return result.scalar_one_or_none() is not None


async def _recent_readings(db: AsyncSession, device_id: int, n: int) -> list[Reading]:
    result = await db.execute(
        select(Reading)
        .where(Reading.device_id == device_id)
        .order_by(Reading.timestamp.desc())
        .limit(n)
    )
    return list(result.scalars().all())


async def run_detection(
    db: AsyncSession, device_id: int, fall_detected: bool, current_reading_id: int
) -> list[str]:
    triggered: list[str] = []

    if fall_detected and not await _has_active_event(db, device_id, "fall"):
        event = Event(
            device_id=device_id,
            type="fall",
            severity="critical",
            message="Caída detectada por el firmware del ESP32",
            detected_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(event)
        triggered.append("fall")

    n = max(TACHYCARDIA_CONSECUTIVE, LOW_SPO2_CONSECUTIVE)
    readings = await _recent_readings(db, device_id, n)

    if len(readings) >= LOW_SPO2_CONSECUTIVE:
        window = readings[:LOW_SPO2_CONSECUTIVE]
        if all(r.spo2 is not None and r.spo2 < LOW_SPO2_THRESHOLD for r in window):
            if not await _has_active_event(db, device_id, "low_spo2"):
                event = Event(
                    device_id=device_id,
                    type="low_spo2",
                    severity="critical",
                    message=f"SpO2 < {LOW_SPO2_THRESHOLD}% durante {LOW_SPO2_CONSECUTIVE} lecturas consecutivas",
                    detected_at=datetime.now(timezone.utc).replace(tzinfo=None),
                )
                db.add(event)
                triggered.append("low_spo2")

    if len(readings) >= TACHYCARDIA_CONSECUTIVE:
        window = readings[:TACHYCARDIA_CONSECUTIVE]
        if all(r.heart_rate is not None and r.heart_rate > TACHYCARDIA_BPM and r.activity == "rest" for r in window):
            if not await _has_active_event(db, device_id, "tachycardia"):
                event = Event(
                    device_id=device_id,
                    type="tachycardia",
                    severity="warning",
                    message=f"FC > {TACHYCARDIA_BPM} BPM en reposo durante {TACHYCARDIA_CONSECUTIVE} lecturas",
                    detected_at=datetime.now(timezone.utc).replace(tzinfo=None),
                )
                db.add(event)
                triggered.append("tachycardia")

    if len(readings) >= BRADYCARDIA_CONSECUTIVE:
        window = readings[:BRADYCARDIA_CONSECUTIVE]
        if all(r.heart_rate is not None and r.heart_rate < BRADYCARDIA_BPM for r in window):
            if not await _has_active_event(db, device_id, "bradycardia"):
                event = Event(
                    device_id=device_id,
                    type="bradycardia",
                    severity="warning",
                    message=f"FC < {BRADYCARDIA_BPM} BPM durante {BRADYCARDIA_CONSECUTIVE} lecturas consecutivas",
                    detected_at=datetime.now(timezone.utc).replace(tzinfo=None),
                )
                db.add(event)
                triggered.append("bradycardia")

    return triggered
