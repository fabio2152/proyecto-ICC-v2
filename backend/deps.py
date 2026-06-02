"""Helpers compartidos para resolver paciente/dispositivo en los routers."""
import os
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Device, Patient

DEMO_DEVICE_KEY = os.getenv("DEMO_DEVICE_KEY", "esp32-dev-key-001")
DEMO_PATIENT_ID = int(os.getenv("DEMO_PATIENT_ID", "1"))


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
