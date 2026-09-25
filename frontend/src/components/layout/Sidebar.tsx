import { NavLink } from 'react-router-dom'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUser } from '@/features/auth/hooks'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

import { Logo } from './Logo'
import { visibleNavItems } from './nav'

interface SidebarNavProps {
  /** Icon-only rail (tablet widths). */
  compact?: boolean
  onNavigate?: () => void
}

export function SidebarNav({ compact = false, onNavigate }: SidebarNavProps) {
  const user = useUser()

  return (
    <nav aria-label={t.nav.mainMenu} className="flex flex-col gap-1 px-3">
      {visibleNavItems(user).map(({ to, label, icon: Icon }) => {
        const link = (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                'text-sidebar-foreground hover:bg-muted hover:text-foreground',
                isActive &&
                  'bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active hover:text-sidebar-active-foreground',
                compact && 'justify-center px-0',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" />
            {compact ? <span className="sr-only">{label}</span> : label}
          </NavLink>
        )
        if (!compact) return link
        return (
          <Tooltip key={to}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </nav>
  )
}

/** Persistent sidebar: icon rail on tablets (md), full width on desktop (lg+). */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar md:flex md:w-[72px] lg:w-64">
      <div className="flex h-16 items-center px-5 md:justify-center lg:justify-start">
        <Logo className="lg:hidden" compact />
        <Logo className="hidden lg:flex" />
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <div className="lg:hidden">
          <SidebarNav compact />
        </div>
        <div className="hidden lg:block">
          <SidebarNav />
        </div>
      </div>
    </aside>
  )
}
