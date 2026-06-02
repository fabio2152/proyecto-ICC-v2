from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import MedicalHistory
from schemas import MedicalHistoryOut, MedicalHistoryIn
from deps import resolve_patient_id

router = APIRouter()


@router.get("/history", response_model=list[MedicalHistoryOut])
async def get_history(
    patient_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    pid = await resolve_patient_id(db, patient_id)
    result = await db.execute(
        select(MedicalHistory)
        .where(MedicalHistory.patient_id == pid)
        .order_by(MedicalHistory.date.desc())
    )
    return list(result.scalars().all())


@router.post("/history", response_model=MedicalHistoryOut, status_code=201)
async def create_history_entry(
    payload: MedicalHistoryIn,
    patient_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    pid = await resolve_patient_id(db, patient_id)
    entry = MedicalHistory(
        patient_id=pid,
        type=payload.type,
        title=payload.title,
        description=payload.description,
        date=payload.date,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
