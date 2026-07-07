import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// El backend devuelve timestamps UTC sin sufijo 'Z'. Sin él, JS los interpreta
// como hora local (UTC-5 en Perú) y las fechas/horas salen desfasadas.
function toUtc(iso: string): string {
  return iso.endsWith('Z') ? iso : iso + 'Z'
}

export function formatTime(iso: string) {
  return new Date(toUtc(iso)).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatDate(iso: string) {
  return new Date(toUtc(iso)).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
