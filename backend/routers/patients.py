from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Patient
from schemas import PatientOut
import os

router = APIRouter()

DEMO_PATIENT_ID = int(os.getenv("DEMO_PATIENT_ID", "1"))


@router.get("/patient", response_model=PatientOut)
async def get_patient(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.id == DEMO_PATIENT_ID))
    patient = result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return patient
