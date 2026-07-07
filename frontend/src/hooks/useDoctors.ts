import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

export interface Doctor {
  username: string
}

export interface DoctorCreated {
  username: string
  password: string
}

export function useDoctors() {
  return useQuery<Doctor[]>({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data } = await client.get<Doctor[]>('/api/doctors')
      return data
    },
  })
}

export function useCreateDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (username: string) => client.post<DoctorCreated>('/api/doctors', { username }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  })
}

export function useRenameDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ username, newUsername }: { username: string; newUsername: string }) =>
      client.patch(`/api/doctors/${username}`, { username: newUsername }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export function useDeleteDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (username: string) => client.delete(`/api/doctors/${username}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export function useAssignDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ patientId, doctor }: { patientId: number; doctor: string | null }) =>
      client.patch(`/api/patients/${patientId}/assign`, { doctor }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}
