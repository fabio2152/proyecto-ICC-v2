import datetime as dt
from pydantic import BaseModel


class IngestPayload(BaseModel):
    device_key: str
    heart_rate: float
    spo2: float
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    temperature: float
    fall_detected: bool = False


class IngestResponse(BaseModel):
    status: str
    reading_id: int
    events_triggered: list[str]


class ReadingOut(BaseModel):
    id: int
    device_id: int
    heart_rate: float | None
    spo2: float | None
    accel_x: float | None
    accel_y: float | None
    accel_z: float | None
    gyro_x: float | None
    gyro_y: float | None
    gyro_z: float | None
    activity: str | None
    fall_detected: bool
    temperature: float | None
    timestamp: dt.datetime

    model_config = {"from_attributes": True}


class EventOut(BaseModel):
    id: int
    device_id: int
    type: str
    severity: str
    message: str | None
    acknowledged: bool
    detected_at: dt.datetime

    model_config = {"from_attributes": True}


class PatientOut(BaseModel):
    id: int
    name: str
    age: int | None
    diagnosis: str | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class PatientCreate(BaseModel):
    name: str
    age: int | None = None
    diagnosis: str | None = None


class PatientCreatedOut(BaseModel):
    """Respuesta al crear un paciente: incluye las credenciales generadas."""
    id: int
    name: str
    age: int | None
    diagnosis: str | None
    username: str
    password: str


class PatientUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    diagnosis: str | None = None


class PatientListItem(BaseModel):
    """Paciente con info resumida para la tabla de administración."""
    id: int
    name: str
    age: int | None
    diagnosis: str | None
    device_key: str | None
    is_protected: bool          # True = Paciente 0, no se puede eliminar
    assigned_doctor: str | None  # username del doctor asignado
    username: str | None         # usuario de login del paciente
    last_seen: dt.datetime | None
    last_heart_rate: float | None
    last_spo2: float | None


class PatientCredentialsUpdate(BaseModel):
    username: str | None = None
    password: str | None = None


class PatientCredentialsOut(BaseModel):
    username: str


class ChangeOwnPasswordIn(BaseModel):
    current_password: str
    new_password: str


class DoctorOut(BaseModel):
    username: str
    name: str | None = None


class DoctorCreate(BaseModel):
    name: str
    username: str
    password: str


class DoctorUpdate(BaseModel):
    name: str | None = None
    username: str | None = None
    password: str | None = None


class AssignDoctorIn(BaseModel):
    doctor: str | None = None   # username del doctor, o null para desasignar


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    status: str
    token: str
    role: str
    patient_id: int | None = None
    name: str | None = None
    username: str


class MeOut(BaseModel):
    username: str
    role: str
    patient_id: int | None = None
    name: str | None = None


class AuditLogOut(BaseModel):
    id: int
    username: str | None
    action: str
    detail: str | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class MedicalHistoryOut(BaseModel):
    id: int
    patient_id: int
    type: str
    title: str
    description: str | None
    date: dt.date | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class MedicalHistoryIn(BaseModel):
    type: str
    title: str
    description: str | None = None
    date: dt.date | None = None


class PatientConditionOut(BaseModel):
    id: int
    patient_id: int
    condition_id: str
    name: str
    emoji: str | None
    category: str | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class PatientConditionIn(BaseModel):
    condition_id: str
    name: str
    emoji: str | None = None
    category: str | None = None


class StatsOut(BaseModel):
    avg_hr: float | None
    min_hr: float | None
    max_hr: float | None
    avg_spo2: float | None
    min_spo2: float | None
    max_spo2: float | None


class AiConfigIn(BaseModel):
    api_key: str


class AiStatusOut(BaseModel):
    configured: bool


class AiAnalyzeIn(BaseModel):
    type: str  # "summary" | "events" | "trend"


class AiAnalyzeOut(BaseModel):
    text: str
