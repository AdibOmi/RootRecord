/**
 * UI-side permission map. This only hides controls; the backend enforces every
 * rule independently. Keep in sync with the role dependencies in the API.
 */
import type { User, UserRole } from '@/api/types'

const PERMISSIONS = {
  'staff:manage': ['admin'],
  'settings:manage': ['admin'],
  'procedures:manage': ['admin'],
  'reports:view': ['admin'],
  'audit:view': ['admin'],
  'collections:view': ['admin'],
  'billing:view': ['admin', 'receptionist'],
  'billing:manage': ['admin', 'receptionist'],
  'dues:view': ['admin', 'receptionist'],
  'patients:edit': ['admin', 'dentist', 'receptionist'],
  /** Deletes the patient's prescriptions too. */
  'patients:delete': ['admin'],
  'prescriptions:scan': ['admin', 'dentist', 'receptionist'],
  /** Confirm scanned prescriptions and correct filed ones. */
  'clinical:edit': ['admin', 'dentist'],
  'treatmentPlans:edit': ['admin', 'dentist'],
  'appointments:manage': ['admin', 'receptionist'],
  'reminders:manage': ['admin', 'receptionist'],
} as const satisfies Record<string, readonly UserRole[]>

export type Permission = keyof typeof PERMISSIONS

export function can(user: Pick<User, 'role'> | null | undefined, permission: Permission): boolean {
  if (!user) return false
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(user.role)
}
