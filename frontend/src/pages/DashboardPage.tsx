import { CalendarCheckIcon, CameraIcon, UserPlusIcon, UsersIcon, WalletIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/features/auth/hooks'
import { t } from '@/i18n'
import { clinicHour, formatLongDate } from '@/lib/format'
import { can } from '@/lib/permissions'

function greeting(): string {
  const hour = clinicHour()
  if (hour < 12) return t.dashboard.greetingMorning
  if (hour < 17) return t.dashboard.greetingAfternoon
  return t.dashboard.greetingEvening
}

/**
 * Phase 1 shell: layout and loading skeletons. Real figures arrive with the
 * dashboard endpoint in Phase 5.
 */
export function DashboardPage() {
  const user = useUser()
  const firstName = user.full_name.replace(/^dr\.?\s+/i, '').split(' ')[0]

  const stats = [
    { label: t.dashboard.patientsToday, icon: UsersIcon },
    { label: t.dashboard.newThisMonth, icon: UserPlusIcon },
    { label: t.dashboard.recallsThisWeek, icon: CalendarCheckIcon },
    ...(can(user, 'collections:view') ? [{ label: t.dashboard.todaysCollection, icon: WalletIcon }] : []),
  ]

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={`${t.dashboard.todayIs} ${formatLongDate(new Date())}`}
        actions={
          can(user, 'prescriptions:scan') && (
            <Button size="lg" asChild>
              <Link to="/scan">
                <CameraIcon />
                {t.nav.scan}
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-5" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Skeleton className="h-6 w-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.dashboard.todaysAppointments}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recallsDue}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
