import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

export interface Doctor {
  username: string
  name: string | null
}

export interface DoctorInput {
  name: string
  username: string
  password: string
}

export interface DoctorUpdateInput {
  name?: string
  username?: string
  password?: string
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
    mutationFn: (input: DoctorInput) => client.post<Doctor>('/api/doctors', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  })
}

export function useUpdateDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ username, input }: { username: string; input: DoctorUpdateInput }) =>
      client.patch<Doctor>(`/api/doctors/${username}`, input),
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
