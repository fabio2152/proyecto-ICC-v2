from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Session
from schemas import DoctorOut, DoctorCreate, DoctorCreatedOut
from deps import require_roles, require_company
from services.auth import create_doctor_user, audit

router = APIRouter()


@router.get("/doctors", response_model=list[DoctorOut])
async def list_doctors(
    _user: Session = Depends(require_roles("company", "doctor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.role == "doctor").order_by(User.username))
    return [DoctorOut(username=u.username) for u in result.scalars().all()]


@router.post("/doctors", response_model=DoctorCreatedOut, status_code=201)
async def create_doctor(
    payload: DoctorCreate,
    actor: Session = Depends(require_company),
    db: AsyncSession = Depends(get_db),
):
    uname = payload.username.strip().lower()
    if not uname:
        raise HTTPException(status_code=400, detail="El usuario no puede estar vacío")
    existing = await db.execute(select(User).where(User.username == uname))
    if existing.scalars().first() is not None:
        raise HTTPException(status_code=409, detail="Ese usuario ya existe")

    username, password = await create_doctor_user(db, uname)
    await db.commit()
    await audit(db, actor.username, "crear_doctor", username)
    return DoctorCreatedOut(username=username, password=password)
