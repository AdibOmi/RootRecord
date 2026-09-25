import { ShieldAlertIcon, WifiOffIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { FullPageLoader } from '@/components/common/FullPageLoader'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'
import { can, type Permission } from '@/lib/permissions'

import { useCurrentUser } from './hooks'

/** Renders child routes only with a valid session; otherwise sends the user to /login. */
export function RequireAuth() {
  const { data: user, isPending, isError, refetch } = useCurrentUser()
  const location = useLocation()

  if (isPending) return <FullPageLoader />
  if (isError) {
    return (
      <div className="grid min-h-full place-items-center p-6">
        <EmptyState
          icon={WifiOffIcon}
          title={t.common.somethingWrong}
          description={t.common.networkError}
          action={<Button onClick={() => void refetch()}>{t.common.retry}</Button>}
        />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

/** Shows a "no access" state when the current user lacks the permission. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const { data: user } = useCurrentUser()
  if (!can(user, permission)) {
    return (
      <EmptyState
        className="mt-16"
        icon={ShieldAlertIcon}
        title={t.forbidden.title}
        description={t.forbidden.body}
      />
    )
  }
  return <>{children}</>
}
