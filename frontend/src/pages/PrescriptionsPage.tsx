import { BadgeCheckIcon, CameraIcon, FileCheckIcon, InboxIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import type { PrescriptionListParams } from '@/api/prescriptions'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/features/auth/hooks'
import { usePrescriptions } from '@/features/prescriptions/hooks'
import { PrescriptionRow } from '@/features/prescriptions/PrescriptionRow'
import { t } from '@/i18n'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

/** "draft": scans without a patient. "unchecked": filed, not checked by a dentist yet. */
type Tab = 'draft' | 'unchecked' | 'confirmed'

const TAB_FILTERS: Record<Tab, Pick<PrescriptionListParams, 'status' | 'verified'>> = {
  draft: { status: 'draft' },
  unchecked: { status: 'confirmed', verified: false },
  confirmed: { status: 'confirmed' },
}

function parseTab(value: string | null): Tab {
  return value === 'unchecked' || value === 'confirmed' ? value : 'draft'
}

export function PrescriptionsPage() {
  const user = useUser()
  const [params, setParams] = useSearchParams()
  const status = parseTab(params.get('status'))
  const page = Number(params.get('page')) || 1
  const query = usePrescriptions({ ...TAB_FILTERS[status], page, page_size: PAGE_SIZE })
  const drafts = usePrescriptions({ ...TAB_FILTERS.draft, page_size: 1 })
  const unchecked = usePrescriptions({ ...TAB_FILTERS.unchecked, page_size: 1 })

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'draft', label: t.prescriptions.toReview, count: drafts.data?.total },
    { value: 'unchecked', label: t.prescriptions.toCheck, count: unchecked.data?.total },
    { value: 'confirmed', label: t.prescriptions.filed },
  ]

  return (
    <>
      <PageHeader
        title={t.prescriptions.title}
        description={t.prescriptions.description}
        actions={
          can(user, 'prescriptions:scan') && (
            <Button asChild>
              <Link to="/scan">
                <CameraIcon />
                {t.nav.scan}
              </Link>
            </Button>
          )
        }
      />

      <div role="tablist" className="mb-4 inline-flex max-w-full overflow-x-auto rounded-lg border bg-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => setParams({ status: tab.value })}
            className={cn(
              'flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors',
              status === tab.value && 'bg-secondary text-secondary-foreground',
            )}
          >
            {tab.label}
            {!!tab.count && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {query.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : query.data && query.data.items.length > 0 ? (
          <div className="divide-y">
            {query.data.items.map((p) => (
              <PrescriptionRow key={p.id} p={p} />
            ))}
          </div>
        ) : status === 'draft' ? (
          <EmptyState
            icon={InboxIcon}
            title={t.prescriptions.emptyDraftsTitle}
            description={t.prescriptions.emptyDraftsBody}
          />
        ) : status === 'unchecked' ? (
          <EmptyState
            icon={BadgeCheckIcon}
            title={t.prescriptions.emptyUncheckedTitle}
            description={t.prescriptions.emptyUncheckedBody}
          />
        ) : (
          <EmptyState
            icon={FileCheckIcon}
            title={t.prescriptions.emptyFiledTitle}
            description={t.prescriptions.emptyFiledBody}
          />
        )}
      </Card>

      {query.data && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={query.data.total}
          onPageChange={(next) => setParams({ status, page: String(next) })}
        />
      )}
    </>
  )
}
