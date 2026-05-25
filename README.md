# Proyecto ICC v2 — Plataforma de Monitoreo Biométrico Remoto

Plataforma web para monitoreo en tiempo real de signos vitales. Recibe datos de un ESP32 con sensores MAX30102 (frecuencia cardíaca, SpO₂) y MPU6050 (acelerómetro, giroscopio) cada 5 segundos vía HTTP POST. Incluye dashboard en vivo, gráficas de tendencias, historial médico y detección automática de eventos críticos.

---

## Clonar el repositorio

Antes de ejecutar el proyecto, clonar el repositorio en su PC:

```bash
git clone https://github.com/fabio2152/proyecto-ICC-v2.git
```

Esto descarga todo el código. A continuación sigue los pasos de instalación y ejecución.

---

## Instalación (solo la primera vez)

### Requisitos previos
- **Python 3.11+** instalado → https://www.python.org/downloads/
- **Node.js 18+** instalado → https://nodejs.org/

### Dentro de la carpeta Backend

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed.py
```

El comando `seed.py` crea la base de datos y carga 24 horas de lecturas sintéticas de ejemplo.

### Dentro de la carpeta Frontend

```bash
npm install
```

---

## Ejecución (cada vez que quieras usarlo)

Necesitas abrir **dos terminales** al mismo tiempo. Una para el backend y otra para el frontend.

### Terminal 1 — Dentro de la carpeta Backend

```bash
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Espera hasta ver:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

> No cierres esta terminal. Si la cierras, el backend se apaga.

### Terminal 2 — Frontend

```bash
npm run dev
```

Espera hasta ver:
```
➜  Local:   http://localhost:5173/
```

> No cierres esta terminal. Si la cierras, el frontend se apaga.

### Abrir en el navegador

Una vez que ambas terminales estén corriendo, abre tu navegador y ve a:

```
http://localhost:5173
```

---

## Arquitectura

El proyecto sigue una arquitectura **frontend/backend separados**. Son dos servicios independientes que se comunican a través de una API REST.

```
monitor/
├── backend/     → API REST en Python (FastAPI)
└── frontend/    → Interfaz web en React + TypeScript
```

El frontend no tiene lógica de negocio ni acceso a la base de datos — solo pide datos al backend cada 3 segundos y los muestra. El backend es el único que toca la BD, valida los datos del ESP32 y detecta eventos críticos.

Esta separación permite que en el futuro:
- El **backend** se despliegue en AWS EC2 sin tocar el frontend
- El **frontend** se sirva desde S3 + CloudFront como archivos estáticos
- Una **app móvil** o el propio **ESP32** consuman la misma API sin cambios

---

## Stack tecnológico

### Backend
| Tecnología | Uso |
|---|---|
| **FastAPI** | Framework web, endpoints REST |
| **SQLAlchemy 2.0** (async) | ORM para acceso a base de datos |
| **SQLite** | Base de datos local (migrable a PostgreSQL en AWS) |
| **Alembic** | Migraciones de esquema |
| **Pydantic v2** | Validación de payloads del ESP32 y schemas |
| **Uvicorn** | Servidor ASGI |

### Frontend
| Tecnología | Uso |
|---|---|
| **React 18 + TypeScript** | UI con tipado estricto |
| **Vite** | Bundler y servidor de desarrollo |
| **Tailwind CSS v3** | Estilos |
| **TanStack Query v5** | Fetching con polling automático cada 3s |
| **Recharts** | Gráficas de series de tiempo (FC + SpO₂ doble eje) |
| **Axios** | Cliente HTTP |
| **React Router v6** | Navegación entre Dashboard e Historial |

### Hardware objetivo
| Componente | Función |
|---|---|
| **ESP32** | Microcontrolador WiFi, envía datos cada 5s vía HTTP POST |
| **MAX30102** | Sensor óptico — frecuencia cardíaca y saturación de oxígeno |
| **MPU6050** | IMU — acelerómetro y giroscopio (detección de actividad y caídas) |

---

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/ingest` | Recibe datos del ESP32 |
| `GET` | `/api/readings/latest` | Última lectura |
| `GET` | `/api/readings` | Lecturas en rango de tiempo |
| `GET` | `/api/events` | Eventos detectados |
| `PATCH` | `/api/events/{id}/acknowledge` | Reconocer un evento |
| `GET` | `/api/patient` | Datos del paciente |
| `GET` | `/api/history` | Historial médico |
| `POST` | `/api/history` | Nueva entrada de historial |
| `GET` | `/api/stats` | Estadísticas 24h |

Documentación interactiva (Swagger): **http://localhost:8000/docs**

---

## Detección automática de eventos

El backend analiza cada lectura entrante y genera alertas automáticas:

| Evento | Condición |
|---|---|
| Caída | `fall_detected = true` en el payload (detección edge del firmware) |
| SpO₂ baja | SpO₂ < 92% durante 12 lecturas consecutivas (~60 segundos) |
| Taquicardia | FC > 100 BPM en reposo durante 24 lecturas (~2 minutos) |
| Bradicardia | FC < 50 BPM durante 24 lecturas (~2 minutos) |
| Inmovilidad | Sin variación de acelerómetro durante 360 lecturas (~30 minutos) |
