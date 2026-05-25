from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import MedicalHistory
from schemas import MedicalHistoryOut, MedicalHistoryIn
import os

router = APIRouter()

DEMO_PATIENT_ID = int(os.getenv("DEMO_PATIENT_ID", "1"))


@router.get("/history", response_model=list[MedicalHistoryOut])
async def get_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MedicalHistory)
        .where(MedicalHistory.patient_id == DEMO_PATIENT_ID)
        .order_by(MedicalHistory.date.desc())
    )
    return list(result.scalars().all())


@router.post("/history", response_model=MedicalHistoryOut, status_code=201)
async def create_history_entry(payload: MedicalHistoryIn, db: AsyncSession = Depends(get_db)):
    entry = MedicalHistory(
        patient_id=DEMO_PATIENT_ID,
        type=payload.type,
        title=payload.title,
        description=payload.description,
        date=payload.date,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
