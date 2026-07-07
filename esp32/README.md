# Firmware ESP32 — VitalSOS

Firmware que corre en el **ESP32** y envía las lecturas de los sensores a la plataforma
cada 5 segundos vía HTTP `POST`. Es el dispositivo físico real del proyecto (el
`simulator/` lo reemplaza cuando no hay hardware).

## Sensores

| Sensor | Mide | Bus |
|---|---|---|
| **MAX30102** | Frecuencia cardíaca (BPM) y saturación de oxígeno SpO₂ (%) | I²C |
| **MPU6050** | Acelerómetro 3 ejes (g) y giroscopio 3 ejes (°/s) | I²C |
| **Botón** | Dispara manualmente el flag de caída (`fall_detected`) para la demo | GPIO 13 |

## Cableado (I²C compartido)

| Señal | ESP32 |
|---|---|
| SDA | GPIO 21 |
| SCL | GPIO 22 |
| VCC | 3V3 |
| GND | GND |
| Botón de caída | GPIO 13 → 3V3 (con `INPUT_PULLDOWN`) |

Ambos sensores comparten el bus I²C (MAX30102 y MPU6050 en 0x68).

## Librerías necesarias (Arduino IDE)

- **SparkFun MAX3010x Sensor Library** (provee `MAX30105.h` y `heartRate.h`)
- WiFi y HTTPClient (incluidas en el core de ESP32)

Placa: cualquier **ESP32 Dev Module**.

## Configuración antes de cargar

En la parte superior de `esp32.ino`:

```cpp
const char* WIFI_SSID  = "TU_RED";
const char* WIFI_PASS  = "TU_CLAVE";
const char* API_URL    = "http://100.30.134.223/api/ingest";  // servidor AWS
const char* DEVICE_KEY = "esp32-dev-key-001";                 // identifica al Paciente 0
```

> El `device_key` `esp32-dev-key-001` es el que la plataforma asocia al **Paciente 0**
> (Fabio). No lo cambies si quieres que los datos lleguen a ese paciente.

## Qué envía (contrato con el backend)

`POST /api/ingest` con este JSON:

```json
{
  "device_key": "esp32-dev-key-001",
  "heart_rate": 72.5,
  "spo2": 98.0,
  "accel_x": 0.01, "accel_y": 0.02, "accel_z": 0.98,
  "gyro_x": 0.1, "gyro_y": -0.2, "gyro_z": 0.05,
  "temperature": 36.5,
  "fall_detected": false
}
```

El ESP32 manda los datos **en bruto**; toda la lógica (clasificar actividad, detectar
caída/taquicardia/bradicardia/SpO₂ baja) vive en el backend.

## Notas

- Solo envía cuando hay dedo en el sensor, tras un *warm-up* de 3 s y con latido válido.
- El **botón** fuerza `fall_detected=true` y hace un envío inmediato (para demostrar la
  alerta **SOS** en la plataforma sin esperar los 5 s).
- La `temperature` es la del chip del sensor, no la corporal — el backend la guarda pero
  **no** se muestra en la interfaz.
