import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import inspect, text
from database import engine, Base, SessionLocal
from routers import ingest, readings, events, patients, history, stats, admin, conditions, ai, audit, doctors
from services.auth import ensure_core_users, backfill_patient_users


def _migrate_columns(sync_conn) -> None:
    """create_all no altera tablas existentes: agrega columnas nuevas si faltan (SQLite)."""
    insp = inspect(sync_conn)
    patient_cols = [c["name"] for c in insp.get_columns("patients")]
    if "assigned_doctor" not in patient_cols:
        sync_conn.execute(text("ALTER TABLE patients ADD COLUMN assigned_doctor VARCHAR"))
    user_cols = [c["name"] for c in insp.get_columns("users")]
    if "name" not in user_cols:
        sync_conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_columns)
    # Asegurar cuentas core y crear usuarios para pacientes existentes (idempotente)
    async with SessionLocal() as db:
        await ensure_core_users(db)
        await backfill_patient_users(db)
    yield


app = FastAPI(title="Monitor Biométrico API", lifespan=lifespan)

_allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api")
app.include_router(readings.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(conditions.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(doctors.router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok"}
