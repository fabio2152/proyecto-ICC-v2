import { useMutation } from '@tanstack/react-query'
import client from '../api/client'

export interface ChangeOwnPasswordInput {
  current_password: string
  new_password: string
}

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (input: ChangeOwnPasswordInput) => client.post('/api/me/change-password', input),
  })
}
