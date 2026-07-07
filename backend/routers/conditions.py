from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import PatientCondition, Session
from schemas import PatientConditionOut, PatientConditionIn
from deps import resolve_patient_id, require_doctor
from services.auth import audit

router = APIRouter()


@router.get("/conditions", response_model=list[PatientConditionOut])
async def get_conditions(
    patient_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    pid = await resolve_patient_id(db, patient_id)
    result = await db.execute(
        select(PatientCondition)
        .where(PatientCondition.patient_id == pid)
        .order_by(PatientCondition.created_at.asc())
    )
    return list(result.scalars().all())


@router.post("/conditions", response_model=PatientConditionOut, status_code=201)
async def add_condition(
    payload: PatientConditionIn,
    patient_id: int | None = Query(None),
    admin: Session = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    pid = await resolve_patient_id(db, patient_id)

    # Evitar duplicados de la misma condición para el mismo paciente.
    existing = await db.execute(
        select(PatientCondition).where(
            PatientCondition.patient_id == pid,
            PatientCondition.condition_id == payload.condition_id,
        )
    )
    found = existing.scalars().first()
    if found is not None:
        return found

    condition = PatientCondition(
        patient_id=pid,
        condition_id=payload.condition_id,
        name=payload.name,
        emoji=payload.emoji,
        category=payload.category,
    )
    db.add(condition)
    await db.commit()
    await db.refresh(condition)
    await audit(db, admin.username, "agregar_condicion", f"{payload.name} → paciente #{pid}")
    return condition


@router.delete("/conditions/{condition_id}", status_code=204)
async def delete_condition(
    condition_id: str,
    patient_id: int | None = Query(None),
    admin: Session = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    pid = await resolve_patient_id(db, patient_id)
    result = await db.execute(
        select(PatientCondition).where(
            PatientCondition.patient_id == pid,
            PatientCondition.condition_id == condition_id,
        )
    )
    condition = result.scalars().first()
    if condition is None:
        raise HTTPException(status_code=404, detail="Condición no encontrada")
    name = condition.name
    await db.delete(condition)
    await db.commit()
    await audit(db, admin.username, "quitar_condicion", f"{name} ← paciente #{pid}")
