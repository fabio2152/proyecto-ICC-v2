"""Helpers compartidos para resolver paciente/dispositivo y autenticación."""
import os
from fastapi import HTTPException, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Device, Patient, Session

DEMO_DEVICE_KEY = os.getenv("DEMO_DEVICE_KEY", "esp32-dev-key-001")
DEMO_PATIENT_ID = int(os.getenv("DEMO_PATIENT_ID", "1"))


def _extract_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip()


async def get_current_user(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Session | None:
    """Devuelve la sesión activa (con username/role/patient_id) o None."""
    token = _extract_token(authorization)
    if not token:
        return None
    return await db.get(Session, token)


async def require_admin(user: Session | None = Depends(get_current_user)) -> Session:
    """Exige una sesión con rol admin (médico). 401 si no; 403 si no es admin."""
    if user is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    return user


async def resolve_patient_id(db: AsyncSession, patient_id: int | None) -> int:
    """Devuelve el patient_id pedido, o el demo si viene None. Valida que exista."""
    pid = patient_id if patient_id is not None else DEMO_PATIENT_ID
    patient = await db.get(Patient, pid)
    if patient is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return pid


async def resolve_device(db: AsyncSession, patient_id: int | None) -> Device:
    """Devuelve el Device del paciente pedido (o del demo si patient_id es None)."""
    if patient_id is None:
        result = await db.execute(select(Device).where(Device.device_key == DEMO_DEVICE_KEY))
    else:
        result = await db.execute(select(Device).where(Device.patient_id == patient_id))
    device = result.scalars().first()
    if device is None:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado para el paciente")
    return device
