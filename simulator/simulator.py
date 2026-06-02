#!/usr/bin/env python3
"""
Simulador ESP32 — Monitor Biométrico
-------------------------------------
Suplanta al hardware ESP32 enviando lecturas al backend via HTTP POST.

STANDALONE: no importa ni depende de nada del proyecto principal.
Puedes eliminar esta carpeta sin romper nada.

Uso:
    pip install requests
    python simulator.py
"""

import os
import sys
import time
import random
import threading

try:
    import requests
except ImportError:
    print("ERROR: Falta el paquete 'requests'.")
    print("Ejecuta:  pip install requests")
    sys.exit(1)

# ─── Configuración ────────────────────────────────────────────────────────────
BACKEND_URL = "http://localhost:8000"
DEVICE_KEY  = "esp32-dev-key-001"
INTERVAL    = 5          # segundos entre lecturas (igual que el ESP32 real)

# ─── Estado compartido (hilo principal ↔ hilo de envío) ──────────────────────
_lock = threading.Lock()
_state = {
    "running":   False,       # True = enviando datos / False = desconectado
    "activity":  "rest",      # rest | walking | running
    "scenario":  "normal",    # normal | low_spo2 | tachycardia | bradycardia
    "fall_next": False,        # True → la próxima lectura tiene fall_detected=true
    "count":     0,            # total de lecturas enviadas con éxito
    "last_hr":   None,
    "last_spo2": None,
    "last_ok":   True,         # False si el último envío falló
    "last_err":  "",
}


# ─── Generación de payload ────────────────────────────────────────────────────
def _generate_payload() -> dict:
    with _lock:
        activity  = _state["activity"]
        scenario  = _state["scenario"]
        fall_next = _state["fall_next"]
        if fall_next:
            _state["fall_next"] = False          # se dispara una sola vez

    # Acelerómetro según actividad real del paciente
    if activity == "rest":
        ax = random.gauss(0.00, 0.02)
        ay = random.gauss(0.00, 0.02)
        az = random.gauss(1.00, 0.02)
    elif activity == "walking":
        ax = random.gauss(0.20, 0.10)
        ay = random.gauss(0.10, 0.05)
        az = random.gauss(1.10, 0.10)
    else:                                        # running
        ax = random.gauss(0.50, 0.20)
        ay = random.gauss(0.30, 0.10)
        az = random.gauss(1.40, 0.15)

    # Valores base normales
    if activity == "rest":
        hr   = random.uniform(63, 78)
    elif activity == "walking":
        hr   = random.uniform(78, 96)
    else:
        hr   = random.uniform(112, 138)
    spo2 = random.uniform(96.5, 99.0)

    # ── Escenarios de eventos ──────────────────────────────────────────────
    if scenario == "low_spo2":
        spo2 = random.uniform(87.0, 91.5)
        hr   = random.uniform(95, 112)           # taquicardia reactiva a hipoxia
        # acelerómetro de reposo para no interferir

    elif scenario == "tachycardia":
        hr   = random.uniform(104, 124)
        # IMPORTANTE: forzamos acelerómetro de reposo para que el backend
        # clasifique la actividad como "rest" y dispare el evento
        ax, ay, az = (random.gauss(0, 0.02),
                      random.gauss(0, 0.02),
                      random.gauss(1.0, 0.02))

    elif scenario == "bradycardia":
        hr   = random.uniform(36, 49)

    return {
        "device_key":    DEVICE_KEY,
        "heart_rate":    round(hr,   1),
        "spo2":          round(spo2, 1),
        "accel_x":       round(ax,   4),
        "accel_y":       round(ay,   4),
        "accel_z":       round(az,   4),
        "gyro_x":        round(random.gauss(0, 0.5), 4),
        "gyro_y":        round(random.gauss(0, 0.5), 4),
        "gyro_z":        round(random.gauss(0, 0.3), 4),
        "temperature":   round(random.uniform(36.2, 37.0), 1),
        "fall_detected": fall_next,
    }


# ─── Hilo de envío ───────────────────────────────────────────────────────────
def _sender_loop():
    """Corre en segundo plano. Envía una lectura cada INTERVAL segundos."""
    while True:
        with _lock:
            running = _state["running"]

        if running:
            payload = _generate_payload()
            try:
                resp = requests.post(
                    f"{BACKEND_URL}/api/ingest",
                    json=payload,
                    timeout=4,
                )
                with _lock:
                    if resp.status_code == 200:
                        _state["count"]    += 1
                        _state["last_hr"]   = payload["heart_rate"]
                        _state["last_spo2"] = payload["spo2"]
                        _state["last_ok"]   = True
                        _state["last_err"]  = ""
                    else:
                        _state["last_ok"]  = False
                        _state["last_err"] = f"HTTP {resp.status_code}"
            except Exception as exc:
                with _lock:
                    _state["last_ok"]  = False
                    _state["last_err"] = str(exc)[:60]

        time.sleep(INTERVAL)


# ─── Interfaz en terminal ─────────────────────────────────────────────────────
_ACTIVITY_LABEL = {
    "rest":    "Reposo",
    "walking": "Caminando",
    "running": "Corriendo",
}
_SCENARIO_LABEL = {
    "normal":      "Normal",
    "low_spo2":    "SpO2 baja  (<92%)",
    "tachycardia": "Taquicardia (>100 BPM en reposo)",
    "bradycardia": "Bradicardia (<50 BPM)",
}


def _clear():
    os.system("cls" if os.name == "nt" else "clear")


def _draw():
    with _lock:
        running   = _state["running"]
        activity  = _state["activity"]
        scenario  = _state["scenario"]
        count     = _state["count"]
        last_hr   = _state["last_hr"]
        last_spo2 = _state["last_spo2"]
        last_ok   = _state["last_ok"]
        last_err  = _state["last_err"]

    W = 50
    bar = "─" * W

    status = "● CONECTADO    " if running else "○ DESCONECTADO "
    hr_str   = f"{last_hr} BPM" if last_hr   is not None else "---"
    spo2_str = f"{last_spo2}%"  if last_spo2 is not None else "---"
    err_str  = f"⚠  {last_err}" if not last_ok and last_err else ""

    def row(label, value, width=W):
        content = f"  {label:<14}{value}"
        return f"║{content:<{width}}║"

    print(f"╔{bar}╗")
    print(f"║{'  SIMULADOR ESP32 — Monitor Biométrico':<{W}}║")
    print(f"╠{bar}╣")
    print(row("Estado:",     status))
    print(row("Actividad:",  _ACTIVITY_LABEL.get(activity, activity)))
    print(row("Modo:",       _SCENARIO_LABEL.get(scenario, scenario)))
    print(row("Enviadas:",   f"{count} lecturas"))
    print(row("Última FC:",  hr_str))
    print(row("Última SpO2:", spo2_str))
    if err_str:
        print(f"║  {err_str:<{W-2}}║")
    print(f"╠{bar}╣")
    print(f"║{'  CONEXIÓN':<{W}}║")
    print(f"║{'  [1]  Iniciar envío (conectar)'   if not running else '  [1]  Detener envío (desconectar)':<{W}}║")
    print(f"║{'':<{W}}║")
    print(f"║{'  ACTIVIDAD DEL PACIENTE':<{W}}║")
    print(f"║{'  [2]  Reposo':<{W}}║")
    print(f"║{'  [3]  Caminando':<{W}}║")
    print(f"║{'  [4]  Corriendo':<{W}}║")
    print(f"║{'':<{W}}║")
    print(f"║{'  SIMULAR EVENTO':<{W}}║")
    print(f"║{'  [5]  Caída  (se dispara una sola vez)':<{W}}║")
    print(f"║{'  [6]  SpO2 baja':<{W}}║")
    print(f"║{'  [7]  Taquicardia (en reposo)':<{W}}║")
    print(f"║{'  [8]  Bradicardia':<{W}}║")
    print(f"║{'  [9]  Volver a Normal':<{W}}║")
    print(f"║{'':<{W}}║")
    print(f"║{'  [0]  Salir':<{W}}║")
    print(f"╚{bar}╝")

    if scenario != "normal":
        mins = (24 * INTERVAL) // 60
        print(f"\n  ℹ  Modo '{_SCENARIO_LABEL[scenario]}' activo.")
        if scenario == "tachycardia" or scenario == "bradycardia":
            print(f"     El evento se detecta tras ~{mins} min de lecturas consecutivas.")
        elif scenario == "low_spo2":
            print(f"     El evento se detecta tras ~{12 * INTERVAL} segundos de lecturas consecutivas.")
        print(f"     Presiona [9] para volver a normal.\n")

    print("  Opción → ", end="", flush=True)


def _handle(choice: str):
    with _lock:
        if choice == "1":
            _state["running"] = not _state["running"]

        elif choice == "2":
            _state["activity"] = "rest"
            _state["scenario"] = "normal"

        elif choice == "3":
            _state["activity"] = "walking"
            _state["scenario"] = "normal"

        elif choice == "4":
            _state["activity"] = "running"
            _state["scenario"] = "normal"

        elif choice == "5":
            _state["fall_next"] = True
            _state["running"]   = True      # asegura que se envíe

        elif choice == "6":
            _state["scenario"]  = "low_spo2"
            _state["activity"]  = "rest"
            _state["running"]   = True

        elif choice == "7":
            _state["scenario"]  = "tachycardia"
            _state["activity"]  = "rest"
            _state["running"]   = True

        elif choice == "8":
            _state["scenario"]  = "bradycardia"
            _state["running"]   = True

        elif choice == "9":
            _state["scenario"]  = "normal"


# ─── Punto de entrada ─────────────────────────────────────────────────────────
def main():
    print(f"\n  Conectando al backend en {BACKEND_URL} ...")
    try:
        requests.get(f"{BACKEND_URL}/", timeout=3)
        print("  Backend disponible ✓")
    except Exception:
        print("  ADVERTENCIA: No se puede alcanzar el backend.")
        print(f"  Verifica que uvicorn esté corriendo en {BACKEND_URL}")
    time.sleep(1)

    thread = threading.Thread(target=_sender_loop, daemon=True)
    thread.start()

    while True:
        _clear()
        _draw()
        try:
            choice = input().strip()
        except (KeyboardInterrupt, EOFError):
            break
        if choice == "0":
            break
        _handle(choice)

    print("\n  Simulador detenido. Adiós.\n")


if __name__ == "__main__":
    main()
