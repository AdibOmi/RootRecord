import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authApi, type ChangePasswordInput, type LoginInput } from '@/api/auth'
import { ApiError } from '@/api/client'
import type { User } from '@/api/types'

export const ME_KEY = ['auth', 'me'] as const

/**
 * Drop all cached data from the previous session and set the current user.
 * Never use `queryClient.clear()` for this: it destroys the in-flight `me`
 * query, leaving the auth guard stuck on its loading state.
 */
export function resetSession(qc: QueryClient, user: User | null): void {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] })
  qc.setQueryData(ME_KEY, user)
}

/** The signed-in user, or `null` when there is no valid session. */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await authApi.me()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    staleTime: Infinity,
    retry: false,
  })
}

/** For components rendered inside the protected shell, where a user always exists. */
export function useUser(): User {
  const { data } = useCurrentUser()
  if (!data) throw new Error('useUser() called outside an authenticated route')
  return data
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (user) => resetSession(qc, user),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => resetSession(qc, null),
  })
}

export function useChangePassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => authApi.changePassword(input),
    onSuccess: () => resetSession(qc, null),
  })
}
