import axios from 'axios'

// En dev usa URL relativa → pasa por el proxy de Vite (vite.config.ts → /api → localhost:8000)
// En producción usa VITE_API_BASE_URL si está definida
const client = axios.create({
  baseURL: import.meta.env.PROD
    ? (import.meta.env.VITE_API_BASE_URL ?? '')
    : '',
  timeout: 5000,
})

// Adjunta el token de sesión (si existe) en cada petición
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
