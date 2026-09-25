import { api } from './client'
import type { Message, User } from './types'

export interface LoginInput {
  email: string
  password: string
}

export interface ChangePasswordInput {
  current_password: string
  new_password: string
}

export const authApi = {
  login: (body: LoginInput) => api.post<User>('/auth/login', body),
  logout: () => api.post<Message>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
  changePassword: (body: ChangePasswordInput) => api.post<Message>('/auth/change-password', body),
}
