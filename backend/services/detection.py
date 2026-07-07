from math import sqrt
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Reading, Event
import os

# Detección de caída = impacto (acelerómetro) + rotación (giroscopio) a la vez.
# Una caída real combina ambos; el AND evita falsos positivos por solo aceleración.
# Umbrales por encima del estático real del ESP32 (accel ≤1.2g, gyro ≤70°/s) pero
# ahora más sensibles: basta un impacto vertical moderado y una caída no tan rápida.
FALL_IMPACT_G = float(os.getenv("FALL_IMPACT_G", "1.8"))       # magnitud del acelerómetro (g)
FALL_GYRO_DPS = float(os.getenv("FALL_GYRO_DPS", "100"))       # magnitud del giroscopio (°/s)

# Golpe muy fuerte: no es locomoción sostenida, se trata como reposo para no marcar
# "corriendo" durante un impacto. Independiente del umbral de caída.
IMPACT_G = float(os.getenv("IMPACT_G", "3.0"))

# Bandas de actividad. La banda de reposo es amplia para que el ruido del sensor en
# estado quieto (≈1.1–1.2g) no salte a "caminando" todo el tiempo.
REST_MAX_G = float(os.getenv("REST_MAX_G", "1.35"))            # < 1.35g → reposo
WALK_MAX_G = float(os.getenv("WALK_MAX_G", "2.0"))             # 1.35–2.0g → caminando

LOW_SPO2_THRESHOLD = float(os.getenv("LOW_SPO2_THRESHOLD", "92"))
LOW_SPO2_CONSECUTIVE = int(os.getenv("LOW_SPO2_CONSECUTIVE", "12"))
TACHYCARDIA_BPM = float(os.getenv("TACHYCARDIA_BPM", "100"))
TACHYCARDIA_CONSECUTIVE = int(os.getenv("TACHYCARDIA_CONSECUTIVE", "24"))
BRADYCARDIA_BPM = float(os.getenv("BRADYCARDIA_BPM", "50"))
BRADYCARDIA_CONSECUTIVE = int(os.getenv("BRADYCARDIA_CONSECUTIVE", "24"))


def classify_activity(accel_x: float, accel_y: float, accel_z: float) -> str:
    magnitude = sqrt(accel_x**2 + accel_y**2 + accel_z**2)
    # Un golpe/impacto fuerte no es locomoción sostenida: no lo marcamos como
    # "corriendo" para no contradecir el evento de caída.
    if magnitude >= IMPACT_G:
        return "rest"
    if magnitude < REST_MAX_G:
        return "rest"
    elif magnitude < WALK_MAX_G:
        return "walking"
    return "running"


def detect_fall(
    accel_x: float, accel_y: float, accel_z: float,
    gyro_x: float, gyro_y: float, gyro_z: float,
) -> bool:
    """Detección de caída en la plataforma: impacto fuerte en el acelerómetro
    (≥ FALL_IMPACT_G) Y rotación brusca en el giroscopio (≥ FALL_GYRO_DPS), a la vez.
    Simple y robusto — no depende del firmware del ESP32."""
    if None in (accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z):
        return False
    accel_mag = sqrt(accel_x**2 + accel_y**2 + accel_z**2)
    gyro_mag = sqrt(gyro_x**2 + gyro_y**2 + gyro_z**2)
    return accel_mag >= FALL_IMPACT_G and gyro_mag >= FALL_GYRO_DPS


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
            message="SOS — Emergencia: posible caída, requiere atención inmediata",
            detected_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(event)
        triggered.append("fall")

    n = max(TACHYCARDIA_CONSECUTIVE, LOW_SPO2_CONSECUTIVE)
    readings = await _recent_readings(db, device_id, n)

    if len(readings) >= LOW_SPO2_CONSECUTIVE:
        window = readings[:LOW_SPO2_CONSECUTIVE]
        # spo2 > 0 descarta lecturas de "sensor sin contacto" (el MAX30102
        # devuelve 0 cuando no hay dedo/muñeca) para no disparar falsa hipoxia.
        if all(r.spo2 is not None and 0 < r.spo2 < LOW_SPO2_THRESHOLD for r in window):
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
        # heart_rate > 0 descarta lecturas de "sensor sin contacto" (el MAX30102
        # devuelve 0 cuando no hay dedo/muñeca) para no disparar falsa bradicardia.
        if all(r.heart_rate is not None and 0 < r.heart_rate < BRADYCARDIA_BPM for r in window):
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
