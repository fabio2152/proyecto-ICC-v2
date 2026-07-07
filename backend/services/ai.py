"""Módulo de IA: genera análisis en lenguaje simple con Anthropic Haiku.

La API key se guarda en la tabla app_settings (se configura desde el historial).
El frontend nunca llama a Anthropic directamente: siempre pasa por aquí.
"""
import anthropic
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import AppSetting, Reading, Event, PatientCondition, Device
from services.analytics import get_stats_24h

API_KEY_SETTING = "anthropic_api_key"
MODEL = "claude-haiku-4-5"

EVENT_LABELS = {
    "fall": "Caída",
    "low_spo2": "Saturación de oxígeno baja",
    "tachycardia": "Ritmo cardíaco acelerado (taquicardia)",
    "bradycardia": "Ritmo cardíaco lento (bradicardia)",
}
ACTIVITY_LABELS = {"rest": "en reposo", "walking": "caminando", "running": "corriendo"}

SYSTEM_PROMPT = (
    "Eres un asistente que explica datos de salud a FAMILIARES sin formación médica. "
    "Usa lenguaje simple, cálido y claro, en español. Evita tecnicismos; si usas un "
    "término médico, explícalo en palabras sencillas. Sé breve y concreto. "
    "IMPORTANTE: no das diagnósticos ni indicaciones médicas. Si algo parece preocupante, "
    "sugiere con calma consultar a un profesional de salud. No inventes datos que no estén "
    "en la información entregada."
)


async def get_api_key(db: AsyncSession) -> str | None:
    setting = await db.get(AppSetting, API_KEY_SETTING)
    return setting.value if setting and setting.value else None


async def set_api_key(db: AsyncSession, api_key: str) -> None:
    setting = await db.get(AppSetting, API_KEY_SETTING)
    if setting is None:
        setting = AppSetting(key=API_KEY_SETTING, value=api_key)
        db.add(setting)
    else:
        setting.value = api_key
    await db.commit()


def _fmt_hour(ts) -> str:
    # timestamps UTC; para la demo mostramos la hora tal cual (HH:MM)
    try:
        return ts.strftime("%H:%M")
    except Exception:
        return "?"


async def build_context(db: AsyncSession, device: Device) -> str:
    """Arma un texto compacto con los datos del paciente para el prompt."""
    stats = await get_stats_24h(db, device.id)

    # Últimas 30 lecturas (más recientes primero)
    res = await db.execute(
        select(Reading)
        .where(Reading.device_id == device.id)
        .order_by(Reading.timestamp.desc())
        .limit(30)
    )
    readings = list(res.scalars().all())

    # Eventos (todos, más recientes primero)
    res = await db.execute(
        select(Event)
        .where(Event.device_id == device.id)
        .order_by(Event.detected_at.desc())
        .limit(20)
    )
    events = list(res.scalars().all())

    # Condiciones clínicas
    res = await db.execute(
        select(PatientCondition).where(PatientCondition.patient_id == device.patient_id)
    )
    conditions = list(res.scalars().all())

    lines: list[str] = []

    def num(v, d=0):
        return f"{v:.{d}f}" if v is not None else "sin dato"

    lines.append("=== Resumen de las últimas 24 horas ===")
    lines.append(
        f"Frecuencia cardíaca (latidos por minuto): promedio {num(stats['avg_hr'])}, "
        f"mínima {num(stats['min_hr'])}, máxima {num(stats['max_hr'])}."
    )
    lines.append(
        f"Saturación de oxígeno (%): promedio {num(stats['avg_spo2'],1)}, "
        f"mínima {num(stats['min_spo2'],1)}, máxima {num(stats['max_spo2'],1)}."
    )

    if conditions:
        lines.append("\n=== Condiciones de salud del paciente ===")
        lines.append(", ".join(c.name for c in conditions) + ".")
    else:
        lines.append("\nEl paciente no tiene condiciones de salud registradas.")

    if events:
        lines.append("\n=== Eventos detectados (más recientes primero) ===")
        for e in events:
            label = EVENT_LABELS.get(e.type, e.type)
            hora = _fmt_hour(e.detected_at)
            estado = "reconocido" if e.acknowledged else "sin reconocer"
            lines.append(f"- {label} a las {hora} (gravedad: {e.severity}, {estado}).")
    else:
        lines.append("\nNo se detectaron eventos.")

    if readings:
        lines.append("\n=== Últimas lecturas del sensor (hora, FC, SpO2, actividad) ===")
        for r in reversed(readings):  # cronológico
            hr = num(r.heart_rate)
            spo2 = num(r.spo2, 1)
            act = ACTIVITY_LABELS.get(r.activity or "", r.activity or "?")
            # 0/0 = sensor sin contacto
            if r.heart_rate == 0 and r.spo2 == 0:
                lines.append(f"- {_fmt_hour(r.timestamp)}: sensor sin contacto, actividad {act}.")
            else:
                lines.append(f"- {_fmt_hour(r.timestamp)}: FC {hr}, SpO2 {spo2}%, {act}.")

    return "\n".join(lines)


USER_PROMPTS = {
    "summary": (
        "Escribe un RESUMEN CLÍNICO breve (2 o 3 párrafos cortos) del estado del paciente "
        "en las últimas 24 horas, para que lo entienda un familiar sin conocimientos médicos. "
        "Menciona cómo estuvieron el ritmo cardíaco y el oxígeno en general, y si hubo algo "
        "que merezca atención. Tranquilo y claro."
    ),
    "events": (
        "Explica los EVENTOS detectados en lenguaje muy simple para un familiar: qué significa "
        "cada uno, por qué pudo ocurrir en términos generales y qué conviene hacer (con calma, "
        "sin alarmar). Si no hubo eventos, dilo de forma tranquilizadora."
    ),
    "trend": (
        "Describe la EVOLUCIÓN a lo largo del tiempo usando las lecturas: a qué horas hubo "
        "cambios notables (por ejemplo, ritmo más alto o bajo, o cuando el sensor no captó), "
        "y cómo se ve la tendencia general. Lenguaje simple para un familiar."
    ),
}


async def run_analysis(db: AsyncSession, device: Device, kind: str) -> str:
    if kind not in USER_PROMPTS:
        raise HTTPException(status_code=400, detail="Tipo de análisis no válido")

    api_key = await get_api_key(db)
    if not api_key:
        raise HTTPException(status_code=400, detail="IA no configurada: falta la API key de Anthropic")

    context = await build_context(db, device)
    user_prompt = f"{USER_PROMPTS[kind]}\n\nDatos del paciente:\n{context}"

    client = anthropic.AsyncAnthropic(api_key=api_key)
    try:
        message = await client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=400, detail="API key inválida o sin permisos")
    except anthropic.APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Error de la API de Anthropic: {e.status_code}")
    except anthropic.APIConnectionError:
        raise HTTPException(status_code=502, detail="No se pudo conectar con la API de Anthropic")

    text = next((b.text for b in message.content if b.type == "text"), "")
    return text.strip() or "No se pudo generar el análisis."
