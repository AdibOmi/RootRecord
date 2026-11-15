import {
  AlertTriangleIcon,
  CalendarClockIcon,
  ChevronRightIcon,
  Loader2Icon,
  ShieldAlertIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import type { PrescriptionSummary } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n'
import { formatBDT, formatDateTime, formatDay, formatPatientCode } from '@/lib/format'

/** One row in the prescriptions list. */
export function PrescriptionRow({ p }: { p: PrescriptionSummary }) {
  const name = p.patient?.full_name ?? p.extracted_patient_name
  return (
    <Link
      to={`/prescriptions/${p.id}`}
      className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{name ?? t.prescriptions.unmatched}</span>
          {p.patient && (
            <span className="font-mono text-xs text-muted-foreground">
              {formatPatientCode(p.patient.patient_code)}
            </span>
          )}
          {!p.patient && name && <Badge variant="muted">{t.prescriptions.unmatched}</Badge>}
          {p.reading && (
            <Badge variant="muted" className="gap-1">
              <Loader2Icon className="size-3 animate-spin" />
              {t.prescriptions.reading}
            </Badge>
          )}
          {p.status === 'confirmed' && !p.verified && !p.reading && (
            <Badge variant="warning" className="gap-1">
              <ShieldAlertIcon className="size-3" />
              {t.prescriptions.notChecked}
            </Badge>
          )}
          {p.has_extraction_error && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangleIcon className="size-3" />
              {t.prescriptions.unreadable}
            </Badge>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {[p.diagnosis, ...p.procedures].filter(Boolean).join(' · ') || '—'}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{p.visit_date ? formatDay(p.visit_date) : t.prescriptions.noDate}</span>
          {p.medications.length > 0 && (
            <span>
              {t.prescriptions.medicines}: {p.medications.length}
            </span>
          )}
          {p.follow_up_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarClockIcon className="size-3" />
              {t.prescriptions.followUp} {formatDay(p.follow_up_date)}
            </span>
          )}
          {!!p.due_minor && (
            <span className="font-medium text-destructive">
              {t.prescriptions.due} {formatBDT(p.due_minor)}
            </span>
          )}
          {p.status === 'draft' && (
            <span>
              {t.prescriptions.scanned} {formatDateTime(p.created_at)}
            </span>
          )}
        </p>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
