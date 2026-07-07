#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "MAX30105.h"
#include "heartRate.h"




MAX30105 particleSensor;




//CONECCION
const char* WIFI_SSID = "Fabio";
const char* WIFI_PASS = "01234567";
const char* SERVER_URL = "http://100.30.134.223/api/ingest";




//boton
// ---- Botón de caída ----
const int BUTTON_PIN = 13;   // elige el GPIO que uses, ej. GPIO4
bool fallDetected = false;




// ---- API ----
const char* API_URL     = "http://100.30.134.223/api/ingest";
const char* DEVICE_KEY  = "esp32-dev-key-001";
const unsigned long SEND_INTERVAL_MS = 5000; // cada cuánto se envía a la API
unsigned long lastSendTime = 0;




// ---- MPU6050 ----
const uint8_t MPU_ADDR = 0x68;
int16_t accX, accY, accZ;
int16_t tempRaw;
int16_t gyroX, gyroY, gyroZ;
float accX_g, accY_g, accZ_g;
float gyroX_dps, gyroY_dps, gyroZ_dps;
float tempC;




long lastBeat = 0;
float bpm;
float bpmAvg = 0;
float spo2 = 0;
float spo2Avg = 0;




const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte spo2_values[RATE_SIZE];
byte rateSpot = 0;
byte validSamples = 0;
bool validBeatDetected = false;




// ---- Calibración SpO2 ----
const float CALIB_SLOPE  = 17.0;
const float CALIB_OFFSET = 104.0 + 18.0;




// Buffer circular para cálculo de SPO2
const byte BUFFER_SIZE = 100;
uint32_t redBuffer[BUFFER_SIZE];
uint32_t irBuffer[BUFFER_SIZE];
byte bufferLength = 0;
byte bufferHead = 0;




// ---- Warm-up ----
const unsigned long WARMUP_MS = 3000;
unsigned long fingerSince = 0;
bool warmedUp = false;
bool fingerDetectedNow = false;




void processSample(long irValue, long redValue);
void printStatus();
void initMPU6050();
void readMPU6050();
void connectWiFi();
void sendToAPI();




float calculateSPO2(uint32_t *pRed, uint32_t *pIR, int len) {
  if (len < 20) return spo2Avg;




  uint32_t redAvg = 0, irAvg = 0;
  uint32_t redMax = 0, redMin = 4294967295;
  uint32_t irMax = 0, irMin = 4294967295;




  for (int i = 0; i < len; i++) {
    redAvg += pRed[i];
    irAvg  += pIR[i];
    if (pRed[i] > redMax) redMax = pRed[i];
    if (pRed[i] < redMin) redMin = pRed[i];
    if (pIR[i]  > irMax)  irMax  = pIR[i];
    if (pIR[i]  < irMin)  irMin  = pIR[i];
  }




  redAvg /= len;
  irAvg  /= len;
  if (redAvg == 0 || irAvg == 0) return spo2Avg;




  uint32_t redAC = redMax - redMin;
  uint32_t irAC  = irMax - irMin;
  if (redAC == 0 || irAC == 0) return spo2Avg;




  float redRatio = (float)redAC / redAvg;
  float irRatio  = (float)irAC / irAvg;
  if (irRatio == 0) return spo2Avg;




  float ratio = redRatio / irRatio;




  float result = CALIB_OFFSET - CALIB_SLOPE * ratio;




  if (result > 100) result = 100;
  if (result < 70)  result = 70;




  return result;
}




void resetTracking() {
  validBeatDetected = false;
  bufferLength = 0;
  bufferHead = 0;
  validSamples = 0;
  rateSpot = 0;
  bpmAvg = 0;
  spo2Avg = 0;
  warmedUp = false;
  fingerSince = 0;
}




// ---- MPU6050 ----
void initMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission(true);
}




void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, (uint8_t)14, (uint8_t)true);




  accX    = (Wire.read() << 8) | Wire.read();
  accY    = (Wire.read() << 8) | Wire.read();
  accZ    = (Wire.read() << 8) | Wire.read();
  tempRaw = (Wire.read() << 8) | Wire.read();
  gyroX   = (Wire.read() << 8) | Wire.read();
  gyroY   = (Wire.read() << 8) | Wire.read();
  gyroZ   = (Wire.read() << 8) | Wire.read();




  accX_g = accX / 16384.0;
  accY_g = accY / 16384.0;
  accZ_g = accZ / 16384.0;




  gyroX_dps = gyroX / 131.0;
  gyroY_dps = gyroY / 131.0;
  gyroZ_dps = gyroZ / 131.0;




  // Fórmula oficial del datasheet MPU6050 para temperatura en °C
  tempC = (tempRaw / 340.0) + 36.53;
}




// ---- WiFi ----
void connectWiFi() {
  Serial.print("Conectando a WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi conectado, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("No se pudo conectar a WiFi (se reintentará en el loop)");
  }
}




// ---- Envío a la API ----
void sendToAPI() {
  if (!fingerDetectedNow || !warmedUp || !validBeatDetected) {
    Serial.println("Sin lectura válida aún, no se envía a la API");
    return;
  }




  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi no conectado, no se envía a la API");
    return;
  }




  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");




  char payload[400];
  snprintf(payload, sizeof(payload),
    "{"
      "\"device_key\":\"%s\","
      "\"heart_rate\":%.1f,"
      "\"spo2\":%.1f,"
      "\"accel_x\":%.3f,"
      "\"accel_y\":%.3f,"
      "\"accel_z\":%.3f,"
      "\"gyro_x\":%.3f,"
      "\"gyro_y\":%.3f,"
      "\"gyro_z\":%.3f,"
      "\"temperature\":%.1f,"
      "\"fall_detected\":%s"
    "}",
    DEVICE_KEY,
    bpmAvg,
    spo2Avg,
    accX_g,
    accY_g,
    accZ_g,
    gyroX_dps,
    gyroY_dps,
    gyroZ_dps,
    tempC,
    fallDetected ? "true" : "false"
  );




  int httpCode = http.POST(payload);




  if (httpCode > 0) {
    Serial.print("POST enviado, código: ");
    Serial.println(httpCode);
  } else {
    Serial.print("Error en POST: ");
    Serial.println(http.errorToString(httpCode));
  }




  http.end();
}




void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  Serial.println("Hola");
  pinMode(BUTTON_PIN, INPUT_PULLDOWN);




  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 no encontrado");
    while (!particleSensor.begin(Wire, I2C_SPEED_FAST));
  }
  Serial.println("MAX30102 encontrado");




  particleSensor.setup(
    200,
    8,
    2,
    400,
    411,
    16384
  );




  initMPU6050();
  Serial.println("MPU6050 inicializado");




  connectWiFi();




  Serial.println("Coloque el dedo...");
}




void loop() {
  static unsigned long lastPrintTime = 0;
  static bool fallDetectedPrev = false;   // <-- NUEVO: recuerda el estado anterior del botón
  unsigned long currentTime = millis();


  fallDetected = (digitalRead(BUTTON_PIN) == HIGH);


  particleSensor.check();


  while (particleSensor.available()) {
    long irValue  = particleSensor.getFIFOIR();
    long redValue = particleSensor.getFIFORed();


    processSample(irValue, redValue);


    particleSensor.nextSample();
  }


  if (currentTime - lastPrintTime >= 500) {
    lastPrintTime = currentTime;
    readMPU6050();
    printStatus();
  }


  // Detecta el flanco: el botón acaba de pasar de false -> true
  bool fallJustPressed = (fallDetected && !fallDetectedPrev);
  fallDetectedPrev = fallDetected;


  if (fallJustPressed) {
    Serial.println(">> Botón de caída presionado, enviando inmediatamente");
    readMPU6050();       // datos frescos antes de enviar
    sendToAPI();
    lastSendTime = currentTime;   // reinicia el contador de 5s desde este envío
  } else if (currentTime - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = currentTime;
    sendToAPI();
  }
}




void processSample(long irValue, long redValue) {
  bool fingerPresent = (irValue >= 50000);
  fingerDetectedNow = fingerPresent;




  if (!fingerPresent) {
    resetTracking();
  } else {
    unsigned long now = millis();
    if (fingerSince == 0) fingerSince = now;
    if (!warmedUp && (now - fingerSince >= WARMUP_MS)) {
      warmedUp = true;
    }




    redBuffer[bufferHead] = redValue;
    irBuffer[bufferHead]  = irValue;
    bufferHead = (bufferHead + 1) % BUFFER_SIZE;
    if (bufferLength < BUFFER_SIZE) bufferLength++;




    if (warmedUp && checkForBeat(irValue)) {
      long delta = millis() - lastBeat;
      lastBeat = millis();




      bpm = 60.0 / (delta / 1000.0);




      if (bpm > 40 && bpm < 180) {
        rates[rateSpot] = (byte)bpm;




        if (bufferLength >= 50) {
          uint32_t redLin[BUFFER_SIZE], irLin[BUFFER_SIZE];
          for (byte i = 0; i < bufferLength; i++) {
            byte idx = (bufferHead + BUFFER_SIZE - bufferLength + i) % BUFFER_SIZE;
            redLin[i] = redBuffer[idx];
            irLin[i]  = irBuffer[idx];
          }
          spo2 = calculateSPO2(redLin, irLin, bufferLength);




          if (spo2 >= 70 && spo2 <= 100) {
            spo2_values[rateSpot] = (byte)spo2;
          } else if (validSamples > 0) {
            spo2_values[rateSpot] = (byte)spo2Avg;
          } else {
            spo2_values[rateSpot] = 0;
          }
        }




        rateSpot = (rateSpot + 1) % RATE_SIZE;
        if (validSamples < RATE_SIZE) validSamples++;




        bpmAvg = 0;
        spo2Avg = 0;
        for (byte i = 0; i < validSamples; i++) {
          bpmAvg  += rates[i];
          spo2Avg += spo2_values[i];
        }
        bpmAvg  /= validSamples;
        spo2Avg /= validSamples;




        validBeatDetected = (validSamples >= RATE_SIZE);
      }
    }
  }
}




void printStatus() {
  if (!fingerDetectedNow) {
    Serial.println("No hay nada");
  } else if (!warmedUp) {
    Serial.println("Calentando sensor...");
  } else if (validBeatDetected) {
    Serial.print("BPM: ");
    Serial.print((int)bpmAvg);
    Serial.print(" | SPO2: ");
    Serial.print((int)spo2Avg);
    Serial.print("%");
  } else {
    Serial.print("Detectando...");
  }




  Serial.print(" | Accel(g) X:");
  Serial.print(accX_g, 2);
  Serial.print(" Y:");
  Serial.print(accY_g, 2);
  Serial.print(" Z:");
  Serial.print(accZ_g, 2);
  Serial.print(" | Gyro(°/s) X:");
  Serial.print(gyroX_dps, 1);
  Serial.print(" Y:");
  Serial.print(gyroY_dps, 1);
  Serial.print(" Z:");
  Serial.print(gyroZ_dps, 1);
  Serial.print(" | Temp:");
  Serial.println(tempC, 1);
  Serial.print(" | Fall:");
  Serial.println(fallDetected ? "TRUE" : "false");
}
