"""Autenticación simple con usuarios, roles, sesiones y auditoría.

No es seguridad de producción (contraseña = <usuario>123, hash sha256, HTTP),
pero implementa roles reales y auditoría para el MVP académico.
"""
import os
import secrets
import hashlib
import unicodedata
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import User, Session, AuditLog, Patient

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()


def verify_password(pw: str, hashed: str) -> bool:
    return secrets.compare_digest(hash_password(pw), hashed)


def _slug(name: str) -> str:
    """Primer nombre, sin acentos, minúsculas, solo alfanumérico."""
    first = (name or "").strip().split(" ")[0]
    norm = unicodedata.normalize("NFKD", first).encode("ascii", "ignore").decode("ascii")
    slug = "".join(c for c in norm.lower() if c.isalnum())
    return slug or "paciente"


async def make_username(db: AsyncSession, name: str) -> str:
    base = _slug(name)
    candidate = base
    n = 1
    while True:
        res = await db.execute(select(User).where(User.username == candidate))
        if res.scalars().first() is None:
            return candidate
        n += 1
        candidate = f"{base}{n}"


async def create_patient_user(db: AsyncSession, patient: Patient) -> tuple[str, str]:
    """Crea el usuario de un paciente. Devuelve (username, password_plano)."""
    username = await make_username(db, patient.name)
    password = f"{username}123"
    db.add(User(
        username=username,
        password_hash=hash_password(password),
        role="patient",
        patient_id=patient.id,
    ))
    return username, password


# Contraseña fija para todas las cuentas de doctor (MVP).
DOCTOR_PASSWORD = "doctor123"

# Cuentas fijas del sistema: la empresa y un doctor inicial (doctor1).
# Se conserva el legacy admin/doctor como doctor por compatibilidad.
CORE_USERS = [
    ("empresa", "empresa123", "company"),
    ("doctor1", DOCTOR_PASSWORD, "doctor"),
]


async def create_doctor_user(db: AsyncSession, username: str) -> tuple[str, str]:
    """Crea una cuenta de doctor (contraseña fija DOCTOR_PASSWORD). Devuelve (username, password)."""
    uname = username.strip().lower()
    db.add(User(
        username=uname,
        password_hash=hash_password(DOCTOR_PASSWORD),
        role="doctor",
        patient_id=None,
    ))
    return uname, DOCTOR_PASSWORD


async def ensure_core_users(db: AsyncSession) -> None:
    """Crea/asegura las cuentas de empresa y doctor (idempotente).

    Migra el legacy 'admin' (rol 'admin') a rol 'doctor' para que siga sirviendo
    como cuenta del médico.
    """
    changed = False

    # Legacy admin → doctor
    res = await db.execute(select(User).where(User.username == ADMIN_USERNAME))
    admin = res.scalars().first()
    if admin is None:
        db.add(User(
            username=ADMIN_USERNAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="doctor",
            patient_id=None,
        ))
        changed = True
    elif admin.role != "doctor":
        admin.role = "doctor"
        changed = True

    # Empresa y doctor
    for username, password, role in CORE_USERS:
        res = await db.execute(select(User).where(User.username == username))
        if res.scalars().first() is None:
            db.add(User(
                username=username,
                password_hash=hash_password(password),
                role=role,
                patient_id=None,
            ))
            changed = True

    if changed:
        await db.commit()


async def backfill_patient_users(db: AsyncSession) -> None:
    """Crea un usuario para cada paciente que aún no tenga uno (idempotente)."""
    res = await db.execute(select(Patient))
    patients = list(res.scalars().all())
    changed = False
    for p in patients:
        existing = await db.execute(select(User).where(User.patient_id == p.id))
        if existing.scalars().first() is None:
            await create_patient_user(db, p)
            changed = True
    if changed:
        await db.commit()


async def create_session(db: AsyncSession, user: User) -> str:
    token = secrets.token_hex(24)
    db.add(Session(
        token=token,
        username=user.username,
        role=user.role,
        patient_id=user.patient_id,
    ))
    await db.commit()
    return token


async def get_session(db: AsyncSession, token: str) -> Session | None:
    return await db.get(Session, token)


async def delete_session(db: AsyncSession, token: str) -> None:
    s = await db.get(Session, token)
    if s is not None:
        await db.delete(s)
        await db.commit()


async def audit(db: AsyncSession, username: str | None, action: str, detail: str | None = None) -> None:
    db.add(AuditLog(username=username, action=action, detail=detail))
    await db.commit()
