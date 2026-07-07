import os
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Patient, Device, Reading, User, Session
from schemas import (
    PatientOut, PatientCreate, PatientUpdate, PatientListItem, PatientCreatedOut, AssignDoctorIn,
    PatientCredentialsUpdate, PatientCredentialsOut,
)
from deps import require_company, require_doctor
from services.auth import create_patient_user, hash_password, audit

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

        user_result = await db.execute(select(User).where(User.patient_id == p.id))
        patient_user = user_result.scalars().first()

        items.append(PatientListItem(
            id=p.id,
            name=p.name,
            age=p.age,
            diagnosis=p.diagnosis,
            device_key=device.device_key if device else None,
            is_protected=_is_protected(p.id),
            assigned_doctor=p.assigned_doctor,
            username=patient_user.username if patient_user else None,
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


@router.post("/patients", response_model=PatientCreatedOut, status_code=201)
async def create_patient(
    payload: PatientCreate,
    actor: Session = Depends(require_company),
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
    username, password = await create_patient_user(db, patient)

    await db.commit()
    await db.refresh(patient)
    await audit(db, actor.username, "crear_paciente", f"{patient.name} (usuario: {username})")
    return PatientCreatedOut(
        id=patient.id,
        name=patient.name,
        age=patient.age,
        diagnosis=patient.diagnosis,
        username=username,
        password=password,
    )


@router.patch("/patients/{patient_id}", response_model=PatientOut)
async def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    actor: Session = Depends(require_doctor),
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
    await audit(db, actor.username, "editar_paciente", f"{patient.name} (#{patient.id})")
    return patient


@router.patch("/patients/{patient_id}/assign", response_model=PatientOut)
async def assign_doctor(
    patient_id: int,
    payload: AssignDoctorIn,
    actor: Session = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    doctor_username = payload.doctor.strip().lower() if payload.doctor else None
    if doctor_username:
        res = await db.execute(
            select(User).where(User.username == doctor_username, User.role == "doctor")
        )
        if res.scalars().first() is None:
            raise HTTPException(status_code=400, detail="Doctor no encontrado")

    patient.assigned_doctor = doctor_username
    await db.commit()
    await db.refresh(patient)
    await audit(db, actor.username, "asignar_doctor", f"{patient.name} → {doctor_username or 'sin doctor'}")
    return patient


@router.patch("/patients/{patient_id}/credentials", response_model=PatientCredentialsOut)
async def update_patient_credentials(
    patient_id: int,
    payload: PatientCredentialsUpdate,
    actor: Session = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    res = await db.execute(select(User).where(User.patient_id == patient_id))
    user = res.scalars().first()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario del paciente no encontrado")

    changes: list[str] = []

    if payload.username is not None:
        new = payload.username.strip().lower()
        if not new:
            raise HTTPException(status_code=400, detail="El usuario no puede estar vacío")
        if new != user.username:
            clash = await db.execute(select(User).where(User.username == new))
            if clash.scalars().first() is not None:
                raise HTTPException(status_code=409, detail="Ese usuario ya existe")
            old = user.username
            user.username = new
            for s in (await db.execute(select(Session).where(Session.username == old))).scalars().all():
                s.username = new
            changes.append("usuario")

    if payload.password:
        user.password_hash = hash_password(payload.password)
        changes.append("contraseña")

    if changes:
        await db.commit()
        await audit(db, actor.username, "editar_credenciales_paciente", f"{patient.name}: {', '.join(changes)}")

    return PatientCredentialsOut(username=user.username)


@router.delete("/patients/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: int,
    actor: Session = Depends(require_company),
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
    await audit(db, actor.username, "eliminar_paciente", f"{patient_name} (#{patient_id})")
    return None
