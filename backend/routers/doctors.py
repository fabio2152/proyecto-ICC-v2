from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Session, Patient
from schemas import DoctorOut, DoctorCreate, DoctorUpdate
from deps import require_roles, require_company
from services.auth import create_doctor_user, hash_password, audit, ADMIN_USERNAME

router = APIRouter()


async def _get_doctor(db: AsyncSession, username: str) -> User:
    res = await db.execute(
        select(User).where(User.username == username, User.role == "doctor")
    )
    doctor = res.scalars().first()
    if doctor is None or username == ADMIN_USERNAME:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return doctor


@router.get("/doctors", response_model=list[DoctorOut])
async def list_doctors(
    _user: Session = Depends(require_roles("company", "doctor")),
    db: AsyncSession = Depends(get_db),
):
    # Se excluye la cuenta legacy 'admin' (no es un doctor gestionable).
    result = await db.execute(
        select(User)
        .where(User.role == "doctor", User.username != ADMIN_USERNAME)
        .order_by(User.username)
    )
    return [DoctorOut(username=u.username, name=u.name) for u in result.scalars().all()]


@router.post("/doctors", response_model=DoctorOut, status_code=201)
async def create_doctor(
    payload: DoctorCreate,
    actor: Session = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    name = payload.name.strip()
    uname = payload.username.strip().lower()
    if not name or not uname or not payload.password:
        raise HTTPException(status_code=400, detail="Nombre, usuario y contraseña son obligatorios")
    existing = await db.execute(select(User).where(User.username == uname))
    if existing.scalars().first() is not None:
        raise HTTPException(status_code=409, detail="Ese usuario ya existe")

    await create_doctor_user(db, name=name, username=uname, password=payload.password)
    await db.commit()
    await audit(db, actor.username, "crear_doctor", f"{name} (usuario: {uname})")
    return DoctorOut(username=uname, name=name)


@router.patch("/doctors/{username}", response_model=DoctorOut)
async def update_doctor(
    username: str,
    payload: DoctorUpdate,
    actor: Session = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    doctor = await _get_doctor(db, username.strip().lower())
    changes: list[str] = []

    if payload.name is not None:
        new_name = payload.name.strip()
        if new_name and new_name != doctor.name:
            doctor.name = new_name
            changes.append("nombre")

    if payload.username is not None:
        new = payload.username.strip().lower()
        if not new:
            raise HTTPException(status_code=400, detail="El usuario no puede estar vacío")
        if new != doctor.username:
            clash = await db.execute(select(User).where(User.username == new))
            if clash.scalars().first() is not None:
                raise HTTPException(status_code=409, detail="Ese usuario ya existe")
            old = doctor.username
            doctor.username = new
            # Propagar el cambio a sesiones y asignaciones de pacientes
            for s in (await db.execute(select(Session).where(Session.username == old))).scalars().all():
                s.username = new
            for p in (await db.execute(select(Patient).where(Patient.assigned_doctor == old))).scalars().all():
                p.assigned_doctor = new
            changes.append("usuario")

    if payload.password:
        doctor.password_hash = hash_password(payload.password)
        changes.append("contraseña")

    if changes:
        await db.commit()
        await audit(db, actor.username, "editar_doctor", f"{doctor.username}: {', '.join(changes)}")

    return DoctorOut(username=doctor.username, name=doctor.name)


@router.delete("/doctors/{username}", status_code=204)
async def delete_doctor(
    username: str,
    actor: Session = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    uname = username.strip().lower()
    doctor = await _get_doctor(db, uname)
    # Desasignar de pacientes y borrar sus sesiones
    for p in (await db.execute(select(Patient).where(Patient.assigned_doctor == uname))).scalars().all():
        p.assigned_doctor = None
    for s in (await db.execute(select(Session).where(Session.username == uname))).scalars().all():
        await db.delete(s)
    await db.delete(doctor)
    await db.commit()
    await audit(db, actor.username, "eliminar_doctor", uname)
    return None
