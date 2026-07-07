# VitalSOS — Plataforma de Monitoreo Biométrico Remoto

Proyecto de Introducción a las Ciencias de la Computación (UTEC). Plataforma web que
monitorea signos vitales en tiempo real. Un **ESP32** con sensores **MAX30102** (frecuencia
cardíaca y SpO₂) y **MPU6050** (acelerómetro y giroscopio) envía lecturas cada 5 segundos
por internet a una **API** que las procesa, detecta eventos críticos (incluida una alerta
**SOS** por caída) y las muestra en un **dashboard** en vivo, con historial, estadísticas,
catálogo de condiciones clínicas y un módulo de **IA** que explica los datos en lenguaje
simple para la familia.

---

## 🔗 Demo en vivo (AWS)

La plataforma está desplegada en un servidor AWS EC2 y el ESP32 le envía datos por internet:

**http://100.30.134.223**

- API / documentación interactiva (Swagger): **http://100.30.134.223/docs**
- El ESP32 hace `POST` a **http://100.30.134.223/api/ingest**

> Si el servidor estuviera apagado, se puede levantar todo localmente con Docker (abajo).

---

## 👥 Roles y credenciales

Al entrar se pide login. Hay tres tipos de usuario:

| Rol | Usuario | Contraseña | Qué puede hacer |
|---|---|---|---|
| **Empresa** | `empresa` | `empresa123` | Crea/edita/elimina pacientes y doctores, asigna doctores. **No** ve datos clínicos (privacidad). |
| **Médico** | `doctor1` | `doctor123` | Ve solo sus pacientes asignados, su data en vivo, edita condiciones clínicas y ve estadísticas. No crea ni elimina pacientes. |
| **Paciente** | `fabio` | `fabio123` | Ve solo su propio monitoreo y puede cambiar su contraseña. |

> El **Paciente 0** (`fabio`) es el único que recibe datos reales del ESP32/simulador y no
> se puede eliminar. Cada paciente nuevo se crea con su propio usuario y contraseña.

---

## 🧩 Componentes del proyecto

```
.
├── backend/     → API REST en Python (FastAPI) — procesa y guarda los datos
├── frontend/    → Interfaz web (React + TypeScript + Vite)
├── esp32/       → Firmware del ESP32 (Arduino) — el dispositivo físico real
├── simulator/   → Simulador que reemplaza al ESP32 cuando no hay hardware
├── docker-compose.yml → Levanta backend + frontend en contenedores
└── DOCUMENTACION.md   → Documentación técnica completa
```

- **`esp32/`** — firmware que corre en el microcontrolador. Envía las lecturas **en bruto**;
  toda la lógica (actividad, caída, taquicardia, etc.) vive en el backend. Ver
  [esp32/README.md](esp32/README.md).
- El ESP32 (o el simulador) hace `POST /api/ingest` → el backend valida, clasifica la
  actividad, corre la detección de eventos y guarda la lectura → el frontend consulta cada
  3 s y lo muestra.

---

## 🚀 Cómo ejecutarlo

### Opción A — Docker (recomendado, un solo comando)

Requiere **Docker Desktop**.

```bash
git clone https://github.com/fabio2152/proyecto-ICC-v2.git
cd proyecto-ICC-v2
docker compose up --build
```

- App: **http://localhost:8080**
- Docs API: **http://localhost:8080/docs**

La base de datos se siembra automáticamente en el primer arranque (24 h de lecturas de
ejemplo) y persiste en un volumen Docker.

### Opción B — Manual (Python + Node)

Requisitos: **Python 3.11+** y **Node.js 18+**.

**Terminal 1 — Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
python seed.py               # crea la BD + lecturas de ejemplo (solo la 1ª vez)
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm install                  # solo la 1ª vez
npm run dev                  # http://localhost:5173
```

### Opción C — Simulador (sin hardware)

Reemplaza al ESP32 enviando lecturas a la API (menú interactivo: caída, taquicardia, etc.):

```bash
cd simulator
pip install requests
python simulator.py
```

---

## 🛰️ El dispositivo ESP32

El firmware está en [`esp32/esp32.ino`](esp32/esp32.ino). Lee los sensores y hace `POST`
a `http://100.30.134.223/api/ingest` cada 5 segundos. Incluye un **botón** que fuerza la
alerta de **caída (SOS)** para la demostración. Detalles de cableado, librerías y
configuración en [esp32/README.md](esp32/README.md).

Contrato del payload (fijo, el backend depende de él):

```json
{
  "device_key": "esp32-dev-key-001",
  "heart_rate": 72.5, "spo2": 98.0,
  "accel_x": 0.01, "accel_y": 0.02, "accel_z": 0.98,
  "gyro_x": 0.1, "gyro_y": -0.2, "gyro_z": 0.05,
  "temperature": 36.5, "fall_detected": false
}
```

---

## 🧠 Stack tecnológico

**Backend:** FastAPI · SQLAlchemy 2.0 (async) · SQLite · Pydantic v2 · Uvicorn · Anthropic (IA)
**Frontend:** React 18 + TypeScript · Vite · Tailwind CSS · TanStack Query · Recharts · Axios · React Router
**Hardware:** ESP32 · MAX30102 · MPU6050
**Infra:** Docker · AWS EC2 + Nginx

Detalle técnico completo (arquitectura, base de datos, endpoints, detección de eventos,
roles, IA, despliegue AWS): **[DOCUMENTACION.md](DOCUMENTACION.md)**.

---

## ⚙️ Detección de eventos (en el backend)

| Evento | Condición | Severidad |
|---|---|---|
| **SOS / Caída** | `fall_detected` del payload, o impacto+giro bruscos detectados por el servidor | crítica |
| **SpO₂ baja** | SpO₂ < 92 % sostenida (~60 s) | crítica |
| **Taquicardia** | FC > 100 BPM en reposo (~2 min) | alerta |
| **Bradicardia** | FC < 50 BPM sostenida (~2 min) | alerta |

---

*Proyecto académico — UTEC, Introducción a las Ciencias de la Computación.*
