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

export function useAssignDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ patientId, doctor }: { patientId: number; doctor: string | null }) =>
      client.patch(`/api/patients/${patientId}/assign`, { doctor }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}
