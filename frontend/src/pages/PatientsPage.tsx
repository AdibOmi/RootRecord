import { ChevronRightIcon, SearchIcon, UsersIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { usePatients } from '@/features/patients/hooks'
import { t } from '@/i18n'
import { formatDay, formatPatientCode } from '@/lib/format'
import { formatBDPhone } from '@/lib/phone'

const PAGE_SIZE = 20

export function PatientsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Number(params.get('page')) || 1
  const [input, setInput] = useState(q)

  // Search as the user types, without a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim() !== q) setParams(input.trim() ? { q: input.trim() } : {}, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [input, q, setParams])

  const query = usePatients({ q: q || undefined, page, page_size: PAGE_SIZE })

  return (
    <>
      <PageHeader title={t.patients.title} description={t.patients.description} />

      <div className="relative mb-4 max-w-md">
        <SearchIcon className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.patients.searchPlaceholder}
          aria-label={t.patients.searchPlaceholder}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {query.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.data && query.data.items.length > 0 ? (
          <ul className="divide-y">
            {query.data.items.map((patient) => (
              <li key={patient.id}>
                <Link
                  to={`/patients/${patient.id}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{patient.full_name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatPatientCode(patient.patient_code)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[
                        patient.phone && formatBDPhone(patient.phone),
                        patient.age_years != null && `${patient.age_years} ${t.patients.years}`,
                        patient.sex && t.sex[patient.sex],
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <dl className="hidden gap-6 text-right text-xs sm:flex">
                    <div>
                      <dt className="text-muted-foreground">{t.patients.visits}</dt>
                      <dd className="font-medium">{patient.visit_count}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t.patients.lastVisit}</dt>
                      <dd className="font-medium">
                        {patient.last_visit_date ? formatDay(patient.last_visit_date) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t.patients.nextFollowUp}</dt>
                      <dd className="font-medium">
                        {patient.next_follow_up_date ? formatDay(patient.next_follow_up_date) : '—'}
                      </dd>
                    </div>
                  </dl>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={UsersIcon}
            title={q ? t.patients.noResults : t.patients.emptyTitle}
            description={q ? undefined : t.patients.emptyBody}
          />
        )}
      </Card>

      {query.data && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={query.data.total}
          onPageChange={(next) => setParams({ ...(q && { q }), page: String(next) })}
        />
      )}
    </>
  )
}
