import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base, SessionLocal
from routers import ingest, readings, events, patients, history, stats, admin, conditions, ai, audit
from services.auth import ensure_admin_user, backfill_patient_users


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Asegurar usuario admin y crear usuarios para pacientes existentes (idempotente)
    async with SessionLocal() as db:
        await ensure_admin_user(db)
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


@app.get("/")
async def root():
    return {"status": "ok"}
