# Plataforma de Monitoreo Remoto de Signos Vitales — Documentación Técnica

> Documento de contexto del proyecto. Describe el stack tecnológico (lo que usa y lo
> que **no** usa), la arquitectura, la base de datos, la API, la autenticación por
> roles, el módulo de IA y el despliegue en AWS. Refleja el estado **actual** del
> sistema en producción.

---

## 1. Resumen

Plataforma web para **monitoreo remoto de signos vitales en tiempo real**. Un **ESP32**
con sensores biométricos (MAX30102 y MPU6050) envía lecturas cada ~5 s por HTTP POST al
backend. La plataforma procesa esos datos, detecta eventos críticos, los grafica y
permite gestionar múltiples pacientes con roles (médico y paciente) y un módulo de
análisis con IA.

- **Repositorio:** https://github.com/fabio2152/proyecto-ICC-v2 (rama activa: `prototipo-2`)
- **Producción:** http://100.30.134.223 (AWS EC2 + Elastic IP)
- **Hardware:** ESP32 + MAX30102 (FC/SpO₂) + MPU6050 (acelerómetro/giroscopio)

---

## 2. Arquitectura

Dos servicios + un simulador opcional, todo detrás de Nginx en una sola instancia EC2.

```
                 ┌───────────────────────── AWS EC2 (Ubuntu 24.04, t3.micro) ─────────────────────────┐
   ESP32  ──HTTP─▶│  Nginx :80                                                                          │
  (device_key)   │    ├── /            → archivos estáticos (frontend compilado, /frontend/dist)        │
   Navegador ────▶│    ├── /api/*       → proxy → Uvicorn 127.0.0.1:8000 (FastAPI)                       │
                 │    └── /docs,/openapi.json → proxy → FastAPI (Swagger)                                │
                 │                                                                                       │
                 │  systemd: monitor-backend.service (uvicorn, arranque automático)                      │
                 │  SQLite: backend/data/monitor.db                                                      │
                 └───────────────────────────────────────────────────────────────────────────────────────┘
                                     Elastic IP fija: 100.30.134.223
```

- **Backend (FastAPI):** API REST, lógica de negocio, detección de eventos, IA, auth.
- **Frontend (Vite + React):** SPA compilada a estáticos, servida por Nginx.
- **Simulador (opcional):** script Python standalone que suplanta al ESP32 para pruebas.

---

## 3. Stack tecnológico

### 3.1 Lo que SÍ usa

**Backend**
| Tecnología | Uso |
|---|---|
| **Python 3.12** | Lenguaje del backend |
| **FastAPI** | Framework de la API REST (async), documentación automática en `/docs` |
| **Uvicorn** | Servidor ASGI |
| **SQLAlchemy 2.0 (async)** | ORM; acceso a BD sin SQL crudo |
| **aiosqlite** | Driver async de SQLite |
| **SQLite** | Base de datos (un archivo `monitor.db`) |
| **Pydantic v2** | Validación de payloads y schemas de respuesta |
| **python-dotenv** | Variables de entorno (`.env`) |
| **anthropic (SDK oficial)** | Módulo de IA con Claude Haiku 4.5 (`AsyncAnthropic`) |
| **hashlib / secrets / unicodedata** | Hash de contraseñas (sha256), tokens, normalización de usuarios (stdlib) |

**Frontend**
| Tecnología | Uso |
|---|---|
| **Vite** | Bundler / dev server |
| **React 18 + TypeScript (strict)** | UI, componentes funcionales |
| **Tailwind CSS v3** | Estilos (tema oscuro con variables CSS) |
| **Recharts** | Gráfica de tendencia (doble eje Y: FC + SpO₂) |
| **TanStack Query v5** | Fetching con polling (3 s) y mutaciones |
| **Axios** | Cliente HTTP (interceptor que adjunta el token) |
| **React Router v6** | Routing y guards por rol |
| **lucide-react** | Iconos |

**Infraestructura (AWS)**
| Servicio | Uso |
|---|---|
| **EC2 (t3.micro, Ubuntu 24.04)** | Servidor de cómputo |
| **Elastic IP** | Dirección pública fija (100.30.134.223) |
| **Nginx** | Reverse proxy + servidor de estáticos |
| **systemd** | Arranque/supervisión del backend |
| **API de Anthropic (Claude)** | Servicio externo para el módulo de IA |

### 3.2 Lo que NO usa (decisiones deliberadas)

- **No Next.js** — es un SPA con Vite + React puro.
- **No Docker / contenedores** — despliegue directo en EC2 con systemd + Nginx.
- **No XAMPP / Apache / PHP.**
- **No PostgreSQL / RDS todavía** — usa SQLite. El código está **diseñado para migrar** a
  PostgreSQL (AWS RDS) cambiando solo `DATABASE_URL` (ORM agnóstico al motor).
- **No Alembic en la práctica** — Alembic está instalado pero **no se usan migraciones**;
  las tablas se crean con `Base.metadata.create_all` en el arranque (lifespan).
- **No Redis / Celery / colas / WebSockets** — el tiempo real se resuelve con **polling**
  (frontend consulta cada 3 s).
- **No JWT** — la sesión es un token opaco guardado en una tabla `sessions`.
- **No HTTPS** — corre sobre HTTP (suficiente para el MVP académico).
- **No hashing fuerte (bcrypt/argon2)** — contraseñas con sha256 simple (MVP).

---

## 4. Base de datos

**Motor:** SQLite (`backend/data/monitor.db`), acceso async por SQLAlchemy 2.0.
**Creación:** automática al arrancar (`create_all`). No hay migraciones activas.

### Tablas

| Tabla | Campos principales | Propósito |
|---|---|---|
| `patients` | id, name, age, diagnosis, created_at | Pacientes |
| `devices` | id, patient_id→patients, device_key (único), description, last_seen | Dispositivos ESP32 (uno por paciente) |
| `readings` | id, device_id→devices, heart_rate, spo2, accel_x/y/z, gyro_x/y/z, activity, fall_detected, temperature, timestamp | Lecturas de sensores |
| `events` | id, device_id→devices, type, severity, message, acknowledged, detected_at | Eventos detectados |
| `medical_history` | id, patient_id→patients, type, title, description, date, created_at | Historial médico |
| `patient_conditions` | id, patient_id→patients, condition_id, name, emoji, category, created_at | Condiciones clínicas (catálogo interactivo) |
| `app_settings` | key (PK), value | Config clave/valor (guarda la API key de Anthropic) |
| `users` | id, username (único), password_hash, role, patient_id→patients, created_at | Usuarios (médico/paciente) |
| `sessions` | token (PK), username, role, patient_id, created_at | Sesiones activas (token → usuario) |
| `audit_log` | id, username, action, detail, created_at | Registro de auditoría |

**Nota sobre timestamps:** se guardan en UTC **sin sufijo `Z`**. El frontend añade `'Z'`
antes de parsear con `new Date()` para evitar el desfase de zona horaria (Perú UTC-5).
Centralizado en `frontend/src/lib/utils.ts` (`formatTime`, `formatDate`).

---

## 5. Backend — estructura y API

```
backend/
├── main.py            # App FastAPI, CORS, routers, lifespan (create_all + backfill de usuarios)
├── database.py        # Engine async, SessionLocal, Base
├── models.py          # 10 modelos ORM
├── schemas.py         # Schemas Pydantic v2
├── deps.py            # resolve_device/resolve_patient_id + get_current_user + require_admin
├── routers/
│   ├── ingest.py      # POST /api/ingest  ← ESP32
│   ├── readings.py    # GET /api/readings, /api/readings/latest
│   ├── events.py      # GET /api/events, PATCH /api/events/{id}/acknowledge
│   ├── patients.py    # /api/patient + CRUD /api/patients (mutaciones = admin)
│   ├── history.py     # GET/POST /api/history
│   ├── stats.py       # GET /api/stats (resumen 24h)
│   ├── conditions.py  # GET/POST/DELETE /api/conditions (mutaciones = admin)
│   ├── admin.py       # POST /api/admin/login, /api/admin/logout, GET /api/me
│   ├── ai.py          # GET /api/ai/status, POST /api/ai/config (admin), POST /api/ai/analyze
│   └── audit.py       # GET /api/audit (admin) — vista de UI retirada, registro sigue activo
├── services/
│   ├── detection.py   # Detección de eventos (ventanas móviles) + classify_activity
│   ├── analytics.py   # Resumen estadístico 24h (ignora ceros de "sin contacto")
│   ├── ai.py          # Contexto del paciente + llamada a Claude Haiku
│   └── auth.py        # Hash, generación de usuario, sesiones, auditoría, backfill
├── data/monitor.db    # BD (gitignored)
├── seed.py            # Datos iniciales + 17,280 lecturas sintéticas
├── requirements.txt
└── .env
```

### Endpoints principales

**Ingesta (contrato fijo — el ESP32 depende de él, no modificar):**
```
POST /api/ingest
{ "device_key","heart_rate","spo2","accel_x/y/z","gyro_x/y/z","temperature","fall_detected" }
→ { "status":"ok","reading_id":N,"events_triggered":[...] }
```
Flujo: valida `device_key` → calcula `activity` server-side → guarda `reading` →
`run_detection` → actualiza `last_seen`.

**Lecturas/eventos/stats/historial/condiciones:** todos aceptan `?patient_id=` opcional
(si se omite → Paciente 0). Los GET son de lectura; las mutaciones exigen rol admin.

**Autenticación:**
```
POST /api/admin/login   {username,password} → {token,role,patient_id,name,username}
POST /api/admin/logout  (borra la sesión)
GET  /api/me            (contexto del usuario actual)
```

**IA:** `GET /api/ai/status` · `POST /api/ai/config` (admin) · `POST /api/ai/analyze` (`type`).

Documentación interactiva siempre actualizada: **http://100.30.134.223/docs**

---

## 6. Autenticación, roles y auditoría

- **Login real** contra la tabla `users` (contraseña con sha256). Devuelve un **token**
  guardado en `sessions`. El frontend lo adjunta en cada petición como
  `Authorization: Bearer <token>` (interceptor de Axios).
- **Dos roles:**
  - **admin (médico)** — `admin` / `admin123`. Ve y edita todos los pacientes, crea/elimina,
    cambia condiciones clínicas y configura la IA.
  - **patient (paciente)** — usuario = **primer nombre en minúscula**, contraseña
    `<usuario>123` (ej: `fabio` / `fabio123`). Entra al mismo panel pero **solo ve su fila
    y solo puede abrir el monitoreo de su propia cuenta** (sin crear/editar/eliminar,
    sin Configuración).
- **Creación de usuarios:** al crear un paciente (solo el médico), se genera
  automáticamente su usuario (`services/auth.create_patient_user`); al eliminarlo, se borra.
  Colisiones de nombre → sufijo numérico. En cada arranque, `backfill_patient_users`
  crea el usuario de cualquier paciente que no lo tenga (idempotente).
- **Protección server-side:** las mutaciones usan la dependencia `require_admin`
  (401 sin token, 403 si no es admin).
- **Auditoría:** `services/auth.audit` registra login, login fallido, crear/editar/eliminar
  paciente, agregar/quitar condición y cambio de API key. Se consulta con `GET /api/audit`
  (solo admin). *La pestaña de UI fue retirada; el registro en BD sigue activo.*

> ⚠️ **Alcance de seguridad (MVP):** contraseñas predecibles (`<usuario>123`), hash sha256
> simple y HTTP sin cifrar. Suficiente para demostrar el modelo de roles y auditoría; en
> producción real se usaría HTTPS, contraseñas fuertes con bcrypt/argon2 y un secrets manager.

---

## 7. Detección de eventos y actividad (server-side)

Se calcula en el servidor a partir de los datos crudos del ESP32.

**Actividad** (`classify_activity`, por magnitud del acelerómetro):
`rest` (<1.05 g) · `walking` (<1.5 g) · `running` (≥1.5 g).

**Eventos** (`services/detection.py`, ventanas móviles; sin duplicar eventos activos):
| Evento | Condición | Lecturas | Severidad |
|---|---|---|---|
| `fall` | Detección en la plataforma: acelerómetro ≥ 2.5g **y** giroscopio ≥ 150°/s (impacto + rotación), **o** `fall_detected==true` del ESP32 | inmediato | critical |
| `low_spo2` | SpO₂ entre 0 y 92% | 12 (~60s) | critical |
| `tachycardia` | FC > 100 BPM en reposo | 24 (~2min) | warning |
| `bradycardia` | FC entre 0 y 50 BPM | 24 (~2min) | warning |

**"Sensor sin contacto":** el MAX30102 devuelve FC=0 y SpO₂=0 cuando no hay dedo/muñeca.
La UI muestra "Sin lectura / Sensor sin contacto" y la detección **ignora los ceros**
(`0 < valor`) para no disparar falsas alarmas. El resumen 24h también los excluye (CASE→NULL).

---

## 8. Módulo de IA (Claude Haiku)

- **Modelo:** `claude-haiku-4-5` vía el SDK oficial `anthropic` (`AsyncAnthropic`).
- **Seguridad:** la API key vive **solo en el backend** (tabla `app_settings`); el
  frontend nunca la ve ni llama a Anthropic directamente. Se configura en **Configuración**
  (solo el médico) y su cambio queda auditado.
- **Tres análisis** (bajo demanda, en el dashboard del paciente), en lenguaje simple para
  familiares: **Resumen clínico**, **Explicar eventos**, **Evaluar tendencia**.
- `services/ai.py` arma un contexto compacto (stats 24h, últimas lecturas, eventos,
  condiciones) y lo envía con un system prompt que prohíbe dar diagnóstico médico.
- El timeout de esa petición se elevó a 60 s (Haiku tarda más que el timeout global de 5 s).

---

## 9. Frontend — estructura y flujo

```
frontend/src/
├── App.tsx                 # Router + guards (RequireAuth / RequireAdmin)
├── api/client.ts           # Axios + interceptor de token (Bearer)
├── auth/                   # AuthContext (rol, patientId), RequireAuth, RequireAdmin
├── hooks/                  # useReadings, useEvents, useStats, usePatients, useConditions,
│                           #   useAi, useAudit (polling 3s en los de datos)
├── pages/
│   ├── Dashboard.tsx       # Vitales en vivo + gráfica + panel de IA (parametrizado por patientId)
│   ├── History.tsx         # Resumen 24h + condiciones (solo lectura) + eventos + registro crudo
│   └── admin/
│       ├── AdminLogin.tsx        # Login unificado (/login)
│       ├── AdminLayout.tsx       # Nav según rol
│       ├── AdminPatients.tsx     # Tabla de pacientes (gating por rol)
│       ├── AdminPatientDetail.tsx# Dashboard + Historial de un paciente (tabs)
│       ├── AdminConfig.tsx       # Configuración (API key de IA)
│       ├── PatientForm.tsx       # Alta/edición de paciente + condiciones clínicas
│       └── AdminAudit.tsx        # (archivo presente, ruta/nav retiradas)
├── components/
│   ├── vitals/             # HeartRateCard, SpO2Card, ActivityCard, ConnectionStatus
│   ├── charts/VitalsChart.tsx
│   ├── alerts/AlertBanner.tsx
│   ├── history/            # ConditionsCatalog (readOnly), RawDataLog
│   └── ai/                 # AiPanel (3 botones), AiKeyConfig
└── lib/utils.ts            # formateo de fecha/hora con fix de UTC
```

**Routing y roles:**
- `/login` — login para todos. Todos aterrizan en `/admin`; el panel se adapta al rol.
- `/admin` (RequireAuth) → lista de pacientes. Admin ve todo; paciente ve solo su fila.
- `/admin/patients/:id` → dashboard + historial de ese paciente. El paciente solo puede
  abrir el suyo.
- `/admin/config` (RequireAdmin) → API key de IA.
- Rutas antiguas `/dashboard` y `/history` redirigen a `/admin`.

**UI de vitales:** 3 tarjetas (FC, SpO₂ con código de color, Actividad — sin temperatura),
badge de conexión que se reevalúa cada 1 s (umbral **30 s** sin datos = "Sin señal"), y la
gráfica de tendencia con ventanas 30 min / 2 h / 24 h.

---

## 10. Despliegue en AWS

- **EC2** t3.micro, Ubuntu 24.04. **Elastic IP** `100.30.134.223` (fija).
- **Nginx** sirve el frontend compilado (`frontend/dist`) y hace proxy de `/api`, `/docs`
  y `/openapi.json` a Uvicorn en `127.0.0.1:8000`.
- **systemd** (`monitor-backend.service`) levanta el backend automáticamente al encender.
- **SQLite** en disco (volumen EBS): sobrevive apagar/encender; se pierde solo si se
  *termina* la instancia.
- **Egress libre:** la EC2 alcanza `api.anthropic.com` para la IA sin config extra.

**Actualizar producción** (tras `git push`):
```bash
ssh -i <key.pem> ubuntu@100.30.134.223
cd ~/proyecto-ICC-v2 && git reset --hard origin/prototipo-2
cd frontend && npm run build
sudo systemctl restart monitor-backend
```

---

## 11. Configuración de entorno (`backend/.env`)

```env
DATABASE_URL=sqlite+aiosqlite:///./data/monitor.db
DEMO_DEVICE_KEY=esp32-dev-key-001
DEMO_PATIENT_ID=1
SENSOR_INTERVAL_SECONDS=5
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
LOW_SPO2_THRESHOLD=92
LOW_SPO2_CONSECUTIVE=12
TACHYCARDIA_BPM=100
TACHYCARDIA_CONSECUTIVE=24
BRADYCARDIA_BPM=50
BRADYCARDIA_CONSECUTIVE=24
ALLOWED_ORIGINS=http://100.30.134.223
```
`frontend/.env.production`: `VITE_API_BASE_URL=` (vacío → rutas relativas, Nginx enruta).

---

## 12. Comandos de desarrollo local

```bash
# Backend
cd backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000
# (primera vez) python -m venv venv; pip install -r requirements.txt; python seed.py

# Frontend
cd frontend && npm run dev        # http://localhost:5173  (proxy /api → :8000)

# Simulador (opcional, reemplaza al ESP32)
cd simulator && python simulator.py
```

Timings: ESP32/simulador → backend cada **5 s**; frontend → backend (polling) cada **3 s**;
badge "Sin señal" tras **30 s** sin datos.

---

## 13. Credenciales y URLs (para la demo)

| Qué | Valor |
|---|---|
| Plataforma | http://100.30.134.223/login |
| API docs (Swagger) | http://100.30.134.223/docs |
| Médico (admin) | `admin` / `admin123` |
| Paciente con datos reales | `fabio` / `fabio123` (Paciente 0, Fabio Malpartida) |
| Otros pacientes (vacíos) | `maria`/`maria123`, `jose`/`jose123`, `lucia`/`lucia123` |
| ESP32 apunta a | `http://100.30.134.223/api/ingest` (device_key `esp32-dev-key-001`) |

> El ESP32 real solo alimenta al **Paciente 0**. Los demás pacientes existen y se pueden
> ingresar, pero se ven vacíos (nunca reciben datos del hardware).
