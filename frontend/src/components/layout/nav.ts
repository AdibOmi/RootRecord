import {
  BarChart3Icon,
  BellRingIcon,
  CalendarDaysIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  ReceiptIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react'

import type { User } from '@/api/types'
import { t } from '@/i18n'
import { can, type Permission } from '@/lib/permissions'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Omit for items every role can see. */
  permission?: Permission
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: t.nav.dashboard, icon: LayoutDashboardIcon },
  { to: '/patients', label: t.nav.patients, icon: UsersIcon },
  { to: '/appointments', label: t.nav.appointments, icon: CalendarDaysIcon },
  { to: '/recalls', label: t.nav.recalls, icon: BellRingIcon },
  { to: '/billing', label: t.nav.billing, icon: ReceiptIcon, permission: 'billing:view' },
  { to: '/reports', label: t.nav.reports, icon: BarChart3Icon, permission: 'reports:view' },
  { to: '/settings', label: t.nav.settings, icon: SettingsIcon, permission: 'settings:manage' },
]

export function visibleNavItems(user: User): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permission || can(user, item.permission))
}
