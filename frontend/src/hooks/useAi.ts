import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

export interface AiStatus {
  configured: boolean
}

export type AiAnalysisType = 'summary' | 'events' | 'trend'

export function useAiStatus() {
  return useQuery<AiStatus>({
    queryKey: ['ai', 'status'],
    queryFn: async () => {
      const { data } = await client.get<AiStatus>('/api/ai/status')
      return data
    },
  })
}

export function useSaveAiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (apiKey: string) =>
      client.post<AiStatus>('/api/ai/config', { api_key: apiKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'status'] }),
  })
}

export function useAiAnalyze(patientId?: number) {
  return useMutation<string, Error, AiAnalysisType>({
    mutationFn: async (type: AiAnalysisType) => {
      const { data } = await client.post<{ text: string }>(
        '/api/ai/analyze',
        { type },
        { params: patientId ? { patient_id: patientId } : undefined },
      )
      return data.text
    },
  })
}
