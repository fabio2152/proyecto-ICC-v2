import datetime as dt
from sqlalchemy import Integer, String, Float, Boolean, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    age: Mapped[int | None] = mapped_column(Integer)
    diagnosis: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())

    devices: Mapped[list["Device"]] = relationship(back_populates="patient")
    medical_history: Mapped[list["MedicalHistory"]] = relationship(back_populates="patient")


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    device_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    last_seen: Mapped[dt.datetime | None] = mapped_column(DateTime)

    patient: Mapped["Patient"] = relationship(back_populates="devices")
    readings: Mapped[list["Reading"]] = relationship(back_populates="device")
    events: Mapped[list["Event"]] = relationship(back_populates="device")


class Reading(Base):
    __tablename__ = "readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False)
    heart_rate: Mapped[float | None] = mapped_column(Float)
    spo2: Mapped[float | None] = mapped_column(Float)
    accel_x: Mapped[float | None] = mapped_column(Float)
    accel_y: Mapped[float | None] = mapped_column(Float)
    accel_z: Mapped[float | None] = mapped_column(Float)
    gyro_x: Mapped[float | None] = mapped_column(Float)
    gyro_y: Mapped[float | None] = mapped_column(Float)
    gyro_z: Mapped[float | None] = mapped_column(Float)
    activity: Mapped[str | None] = mapped_column(String)
    fall_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    temperature: Mapped[float | None] = mapped_column(Float)
    timestamp: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())

    device: Mapped["Device"] = relationship(back_populates="readings")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str | None] = mapped_column(String)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    detected_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())

    device: Mapped["Device"] = relationship(back_populates="events")


class MedicalHistory(Base):
    __tablename__ = "medical_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    date: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())

    patient: Mapped["Patient"] = relationship(back_populates="medical_history")


class PatientCondition(Base):
    """Condición clínica del paciente (catálogo interactivo del historial)."""
    __tablename__ = "patient_conditions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    condition_id: Mapped[str] = mapped_column(String, nullable=False)  # ej: "diabetes"
    name: Mapped[str] = mapped_column(String, nullable=False)
    emoji: Mapped[str | None] = mapped_column(String)
    category: Mapped[str | None] = mapped_column(String)  # corazon | pulmones | otras
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())
