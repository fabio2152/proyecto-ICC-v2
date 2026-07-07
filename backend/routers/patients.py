import os
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Patient, Device, Reading, User, Session
from schemas import PatientOut, PatientCreate, PatientUpdate, PatientListItem
from deps import require_admin
from services.auth import create_patient_user, audit

router = APIRouter()

DEMO_PATIENT_ID = int(os.getenv("DEMO_PATIENT_ID", "1"))


def _is_protected(patient_id: int) -> bool:
    """El Paciente 0 (demo) no se puede eliminar."""
    return patient_id == DEMO_PATIENT_ID


@router.get("/patient", response_model=PatientOut)
async def get_demo_patient(db: AsyncSession = Depends(get_db)):
    """Paciente demo — usado por la vista del paciente (kiosco)."""
    patient = await db.get(Patient, DEMO_PATIENT_ID)
    if patient is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return patient


@router.get("/patients", response_model=list[PatientListItem])
async def list_patients(db: AsyncSession = Depends(get_db)):
    """Lista todos los pacientes con su estado y últimos vitales (panel admin)."""
    result = await db.execute(select(Patient).order_by(Patient.id))
    patients = list(result.scalars().all())

    items: list[PatientListItem] = []
    for p in patients:
        dev_result = await db.execute(select(Device).where(Device.patient_id == p.id))
        device = dev_result.scalars().first()

        last_hr = last_spo2 = None
        if device is not None:
            r_result = await db.execute(
                select(Reading)
                .where(Reading.device_id == device.id)
                .order_by(Reading.timestamp.desc())
                .limit(1)
            )
            reading = r_result.scalar_one_or_none()
            if reading is not None:
                last_hr = reading.heart_rate
                last_spo2 = reading.spo2

        items.append(PatientListItem(
            id=p.id,
            name=p.name,
            age=p.age,
            diagnosis=p.diagnosis,
            device_key=device.device_key if device else None,
            is_protected=_is_protected(p.id),
            last_seen=device.last_seen if device else None,
            last_heart_rate=last_hr,
            last_spo2=last_spo2,
        ))
    return items


@router.get("/patients/{patient_id}", response_model=PatientOut)
async def get_patient(patient_id: int, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return patient


@router.post("/patients", response_model=PatientOut, status_code=201)
async def create_patient(
    payload: PatientCreate,
    admin: Session = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    patient = Patient(name=payload.name, age=payload.age, diagnosis=payload.diagnosis)
    db.add(patient)
    await db.flush()

    # Cada paciente tiene su propio device_key (el ESP32 real solo usa el del Paciente 0)
    device = Device(
        patient_id=patient.id,
        device_key=f"esp32-{secrets.token_hex(4)}",
        description="Dispositivo generado automáticamente",
    )
    db.add(device)

    # Crear también el usuario del paciente (username = primer nombre, pass = <usuario>123)
    username, _password = await create_patient_user(db, patient)

    await db.commit()
    await db.refresh(patient)
    await audit(db, admin.username, "crear_paciente", f"{patient.name} (usuario: {username})")
    return patient


@router.patch("/patients/{patient_id}", response_model=PatientOut)
async def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    admin: Session = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    if payload.name is not None:
        patient.name = payload.name
    if payload.age is not None:
        patient.age = payload.age
    if payload.diagnosis is not None:
        patient.diagnosis = payload.diagnosis

    await db.commit()
    await db.refresh(patient)
    await audit(db, admin.username, "editar_paciente", f"{patient.name} (#{patient.id})")
    return patient


@router.delete("/patients/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: int,
    admin: Session = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if _is_protected(patient_id):
        raise HTTPException(status_code=403, detail="El Paciente 0 no se puede eliminar")

    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    # Borrar en cascada manual: readings y events de sus devices, luego devices, historial, paciente
    dev_result = await db.execute(select(Device).where(Device.patient_id == patient_id))
    devices = list(dev_result.scalars().all())
    for device in devices:
        r_result = await db.execute(select(Reading).where(Reading.device_id == device.id))
        for reading in r_result.scalars().all():
            await db.delete(reading)
        await db.flush()

    from models import Event, MedicalHistory
    for device in devices:
        e_result = await db.execute(select(Event).where(Event.device_id == device.id))
        for event in e_result.scalars().all():
            await db.delete(event)
    await db.flush()

    for device in devices:
        await db.delete(device)

    h_result = await db.execute(select(MedicalHistory).where(MedicalHistory.patient_id == patient_id))
    for entry in h_result.scalars().all():
        await db.delete(entry)

    from models import PatientCondition
    c_result = await db.execute(select(PatientCondition).where(PatientCondition.patient_id == patient_id))
    for cond in c_result.scalars().all():
        await db.delete(cond)

    # Borrar el usuario del paciente y sus sesiones
    u_result = await db.execute(select(User).where(User.patient_id == patient_id))
    for u in u_result.scalars().all():
        s_result = await db.execute(select(Session).where(Session.username == u.username))
        for s in s_result.scalars().all():
            await db.delete(s)
        await db.delete(u)

    patient_name = patient.name
    await db.delete(patient)
    await db.commit()
    await audit(db, admin.username, "eliminar_paciente", f"{patient_name} (#{patient_id})")
    return None
