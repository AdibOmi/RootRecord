/** Types mirroring backend Pydantic schemas. */

export type UserRole = 'admin' | 'dentist' | 'receptionist'

export interface User {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Message {
  message: string
}
