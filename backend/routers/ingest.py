from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Device, Reading
from schemas import IngestPayload, IngestResponse
from services.detection import classify_activity, run_detection, detect_fall_from_accel

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest(payload: IngestPayload, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.device_key == payload.device_key))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=401, detail="device_key no reconocido")

    activity = classify_activity(payload.accel_x, payload.accel_y, payload.accel_z)

    reading = Reading(
        device_id=device.id,
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        accel_x=payload.accel_x,
        accel_y=payload.accel_y,
        accel_z=payload.accel_z,
        gyro_x=payload.gyro_x,
        gyro_y=payload.gyro_y,
        gyro_z=payload.gyro_z,
        activity=activity,
        fall_detected=payload.fall_detected,  # se guarda el valor crudo del ESP32, sin tocar
        temperature=payload.temperature,
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(reading)
    await db.flush()

    # Detección de caída EN LA PLATAFORMA a partir del acelerómetro, combinada con
    # el flag del ESP32 (cualquiera de los dos dispara el evento).
    fall = payload.fall_detected or detect_fall_from_accel(
        payload.accel_x, payload.accel_y, payload.accel_z
    )
    events_triggered = await run_detection(db, device.id, fall, reading.id)

    device.last_seen = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    await db.refresh(reading)

    return IngestResponse(status="ok", reading_id=reading.id, events_triggered=events_triggered)
