from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Patient, Session
from schemas import AdminLogin, AdminLoginResponse, MeOut, ChangeOwnPasswordIn
from services.auth import (
    verify_password,
    hash_password,
    create_session,
    delete_session,
    audit,
)
from deps import get_current_user, _extract_token

router = APIRouter()


@router.post("/admin/login", response_model=AdminLoginResponse)
async def login(payload: AdminLogin, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.username == payload.username.strip().lower()))
    user = res.scalars().first()
    if user is None or not verify_password(payload.password, user.password_hash):
        await audit(db, payload.username, "login_fallido", None)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    token = await create_session(db, user)

    name = None
    if user.patient_id is not None:
        patient = await db.get(Patient, user.patient_id)
        name = patient.name if patient else None

    await audit(db, user.username, "login", f"rol={user.role}")
    return AdminLoginResponse(
        status="ok",
        token=token,
        role=user.role,
        patient_id=user.patient_id,
        name=name,
        username=user.username,
    )


@router.post("/admin/logout", status_code=204)
async def logout(authorization: str | None = Header(None), db: AsyncSession = Depends(get_db)):
    token = _extract_token(authorization)
    if token:
        await delete_session(db, token)
    return None


@router.get("/me", response_model=MeOut)
async def me(user: Session | None = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    name = None
    if user.patient_id is not None:
        patient = await db.get(Patient, user.patient_id)
        name = patient.name if patient else None
    return MeOut(username=user.username, role=user.role, patient_id=user.patient_id, name=name)


@router.post("/me/change-password", status_code=204)
async def change_own_password(
    payload: ChangeOwnPasswordIn,
    user: Session | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    if user.role != "patient":
        raise HTTPException(status_code=403, detail="Solo los pacientes pueden cambiar su propia contraseña")

    res = await db.execute(select(User).where(User.username == user.username))
    u = res.scalars().first()
    if u is None or not verify_password(payload.current_password, u.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")

    u.password_hash = hash_password(payload.new_password)
    await db.commit()
    await audit(db, user.username, "cambiar_password_propia", None)
    return None
