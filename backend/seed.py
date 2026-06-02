"""Seed: crea paciente demo, device y 24h de lecturas sintéticas."""
import asyncio
import random
import math
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

from database import engine, Base, SessionLocal
from models import Patient, Device, Reading, MedicalHistory


def _hr_for_hour(hour: int) -> tuple[float, float]:
    if 0 <= hour < 6:
        return 55.0, 65.0
    elif 6 <= hour < 9:
        frac = (hour - 6) / 3
        lo = 55 + frac * 10
        hi = 65 + frac * 15
        return lo, hi
    elif 9 <= hour < 12:
        return 65.0, 80.0
    elif 12 <= hour < 18:
        return 80.0, 95.0
    elif 18 <= hour < 20:
        return 70.0, 85.0
    else:
        return 60.0, 75.0


def _spo2_for_hour(hour: int) -> tuple[float, float]:
    if 0 <= hour < 6:
        return 97.0, 99.0
    return 95.0, 99.0


def _activity_for_hour(hour: int) -> str:
    if 12 <= hour < 18:
        return random.choice(["rest", "rest", "walking", "walking", "running"])
    elif 6 <= hour < 9:
        return random.choice(["rest", "walking"])
    return "rest"


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        existing = await db.get(Patient, 1)
        if existing:
            print("Base de datos ya tiene datos. Seed omitido.")
            return

        patient = Patient(name="Fabio Malpartida", age=68, diagnosis="Hipertensión arterial, Diabetes tipo 2")
        db.add(patient)
        await db.flush()

        device_key = os.getenv("DEMO_DEVICE_KEY", "esp32-dev-key-001")
        device = Device(
            patient_id=patient.id,
            device_key=device_key,
            description="ESP32 + MAX30102 + MPU6050",
            last_seen=datetime.utcnow(),
        )
        db.add(device)
        await db.flush()

        # Pacientes de ejemplo (sin lecturas — su dashboard estará vacío).
        # El ESP32 y el simulador solo alimentan al Paciente 0 (Fabio Malpartida).
        ejemplos = [
            ("María Gómez",   54, "Asma crónica"),
            ("José Torres",   71, "EPOC"),
            ("Lucía Ramírez", 39, "Arritmia en seguimiento"),
        ]
        for idx, (nombre, edad, dx) in enumerate(ejemplos, start=1):
            p = Patient(name=nombre, age=edad, diagnosis=dx)
            db.add(p)
            await db.flush()
            db.add(Device(
                patient_id=p.id,
                device_key=f"esp32-demo-{idx:03d}",
                description="Dispositivo de ejemplo (sin datos en vivo)",
            ))
        await db.flush()

        history_entries = [
            MedicalHistory(patient_id=patient.id, type="diagnosis", title="Hipertensión arterial", description="Diagnosticado en 2018. Controlado con medicación.", date=datetime(2018, 3, 15).date()),
            MedicalHistory(patient_id=patient.id, type="diagnosis", title="Diabetes tipo 2", description="HbA1c en rango. Control trimestral.", date=datetime(2020, 7, 10).date()),
            MedicalHistory(patient_id=patient.id, type="medication", title="Metformina 850mg", description="2 veces al día con comidas.", date=datetime(2020, 7, 10).date()),
            MedicalHistory(patient_id=patient.id, type="medication", title="Enalapril 10mg", description="1 vez al día por la mañana.", date=datetime(2018, 4, 1).date()),
            MedicalHistory(patient_id=patient.id, type="allergy", title="Alergia a Penicilina", description="Reacción anafiláctica registrada.", date=datetime(1995, 1, 1).date()),
            MedicalHistory(patient_id=patient.id, type="procedure", title="Ecocardiograma", description="Resultado normal. Fracción de eyección 62%.", date=datetime(2024, 11, 20).date()),
            MedicalHistory(patient_id=patient.id, type="note", title="Visita de control", description="Paciente estable. Se ajusta dosis de Enalapril.", date=datetime(2025, 2, 5).date()),
        ]
        for entry in history_entries:
            db.add(entry)

        now = datetime.utcnow()
        start = now - timedelta(hours=24)
        interval = timedelta(seconds=5)
        total = int(timedelta(hours=24).total_seconds() / 5)

        print(f"Insertando {total} lecturas sintéticas...")
        batch_size = 500
        readings = []

        for i in range(total):
            ts = start + interval * i
            hour = ts.hour

            hr_lo, hr_hi = _hr_for_hour(hour)
            spo2_lo, spo2_hi = _spo2_for_hour(hour)
            activity = _activity_for_hour(hour)

            noise = math.sin(i * 0.1) * 2
            hr = round(random.uniform(hr_lo, hr_hi) + noise, 1)
            spo2 = round(random.uniform(spo2_lo, spo2_hi), 1)

            if activity == "rest":
                ax, ay, az = random.gauss(0.0, 0.02), random.gauss(0.0, 0.02), random.gauss(1.0, 0.02)
            elif activity == "walking":
                ax, ay, az = random.gauss(0.2, 0.1), random.gauss(0.1, 0.05), random.gauss(1.1, 0.1)
            else:
                ax, ay, az = random.gauss(0.5, 0.2), random.gauss(0.3, 0.1), random.gauss(1.4, 0.15)

            readings.append(Reading(
                device_id=device.id,
                heart_rate=hr,
                spo2=spo2,
                accel_x=round(ax, 4),
                accel_y=round(ay, 4),
                accel_z=round(az, 4),
                gyro_x=round(random.gauss(0, 0.5), 4),
                gyro_y=round(random.gauss(0, 0.5), 4),
                gyro_z=round(random.gauss(0, 0.3), 4),
                activity=activity,
                fall_detected=False,
                temperature=round(random.uniform(36.2, 37.0), 1),
                timestamp=ts,
            ))

            if len(readings) >= batch_size:
                db.add_all(readings)
                await db.flush()
                readings = []
                print(f"  {i + 1}/{total} lecturas...")

        if readings:
            db.add_all(readings)

        await db.commit()
        print("Seed completado exitosamente.")


if __name__ == "__main__":
    asyncio.run(seed())
