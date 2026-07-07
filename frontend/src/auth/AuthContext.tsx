import { createContext, useContext, useState, useCallback } from 'react'
import client from '../api/client'

interface LoginResult {
  role: string
  patient_id: number | null
  name: string | null
  username: string
}

interface AuthContextType {
  token: string | null
  role: string | null
  patientId: number | null
  name: string | null
  username: string | null
  isAuthenticated: boolean
  isCompany: boolean
  isDoctor: boolean
  isPatient: boolean
  login: (username: string, password: string) => Promise<LoginResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'auth_token'
const ROLE_KEY = 'auth_role'
const PID_KEY = 'auth_patient_id'
const NAME_KEY = 'auth_name'
const USER_KEY = 'auth_username'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [role, setRole] = useState<string | null>(() => localStorage.getItem(ROLE_KEY))
  const [patientId, setPatientId] = useState<number | null>(() => {
    const v = localStorage.getItem(PID_KEY)
    return v ? Number(v) : null
  })
  const [name, setName] = useState<string | null>(() => localStorage.getItem(NAME_KEY))
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USER_KEY))

  const login = useCallback(async (u: string, password: string): Promise<LoginResult> => {
    const { data } = await client.post<{
      token: string
      role: string
      patient_id: number | null
      name: string | null
      username: string
    }>('/api/admin/login', { username: u, password })

    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(ROLE_KEY, data.role)
    localStorage.setItem(USER_KEY, data.username)
    if (data.patient_id != null) localStorage.setItem(PID_KEY, String(data.patient_id))
    else localStorage.removeItem(PID_KEY)
    if (data.name) localStorage.setItem(NAME_KEY, data.name)
    else localStorage.removeItem(NAME_KEY)

    setToken(data.token)
    setRole(data.role)
    setPatientId(data.patient_id)
    setName(data.name)
    setUsername(data.username)

    return { role: data.role, patient_id: data.patient_id, name: data.name, username: data.username }
  }, [])

  const logout = useCallback(() => {
    // Best-effort: invalida la sesión en el backend
    client.post('/api/admin/logout').catch(() => {})
    ;[TOKEN_KEY, ROLE_KEY, PID_KEY, NAME_KEY, USER_KEY].forEach((k) => localStorage.removeItem(k))
    setToken(null)
    setRole(null)
    setPatientId(null)
    setName(null)
    setUsername(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        patientId,
        name,
        username,
        isAuthenticated: token !== null,
        isCompany: role === 'company',
        isDoctor: role === 'doctor',
        isPatient: role === 'patient',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
