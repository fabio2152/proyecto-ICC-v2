export interface Reading {
  id: number
  device_id: number
  heart_rate: number | null
  spo2: number | null
  accel_x: number | null
  accel_y: number | null
  accel_z: number | null
  gyro_x: number | null
  gyro_y: number | null
  gyro_z: number | null
  activity: 'rest' | 'walking' | 'running' | null
  fall_detected: boolean
  temperature: number | null
  timestamp: string
}

export interface Event {
  id: number
  device_id: number
  type: 'fall' | 'low_spo2' | 'tachycardia' | 'bradycardia' | 'immobility'
  severity: 'critical' | 'warning' | 'info'
  message: string | null
  acknowledged: boolean
  detected_at: string
}

export interface Patient {
  id: number
  name: string
  age: number | null
  diagnosis: string | null
  created_at: string
}

export interface MedicalHistoryEntry {
  id: number
  patient_id: number
  type: 'diagnosis' | 'medication' | 'allergy' | 'note' | 'procedure'
  title: string
  description: string | null
  date: string | null
  created_at: string
}

export interface Stats {
  avg_hr: number | null
  min_hr: number | null
  max_hr: number | null
  avg_spo2: number | null
  min_spo2: number | null
  max_spo2: number | null
}

export interface PatientListItem {
  id: number
  name: string
  age: number | null
  diagnosis: string | null
  device_key: string | null
  is_protected: boolean
  assigned_doctor: string | null
  username: string | null
  last_seen: string | null
  last_heart_rate: number | null
  last_spo2: number | null
}

export interface PatientInput {
  name: string
  age: number | null
  diagnosis: string | null
}
