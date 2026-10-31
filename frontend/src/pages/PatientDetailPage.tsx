import {
  ArrowLeftIcon,
  CalendarClockIcon,
  CameraIcon,
  EllipsisVerticalIcon,
  FileTextIcon,
  PencilIcon,
  Trash2Icon,
  UserXIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ApiError, errorMessage } from '@/api/client'
import type { PrescriptionSummary } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/features/auth/hooks'
import { EditPatientDialog } from '@/features/patients/EditPatientDialog'
import { useDeletePatient, usePatient } from '@/features/patients/hooks'
import { usePrescriptions } from '@/features/prescriptions/hooks'
import { SharePrescription } from '@/features/prescriptions/SharePrescription'
import { t } from '@/i18n'
import { formatDay } from '@/lib/format'
import { can } from '@/lib/permissions'
import { formatBDPhone } from '@/lib/phone'

const PAGE_SIZE = 10

export function PatientDetailPage() {
  const { id = '' } = useParams()
  const user = useUser()
  const patient = usePatient(id)
  const [page, setPage] = useState(1)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const history = usePrescriptions({
    patient_id: id,
    status: 'confirmed',
    page,
    page_size: PAGE_SIZE,
  })

  if (patient.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (patient.isError) {
    const missing = patient.error instanceof ApiError && patient.error.status === 404
    return (
      <EmptyState
        className="mt-16"
        icon={UserXIcon}
        title={missing ? t.notFound.title : t.common.somethingWrong}
        description={missing ? t.patients.notFound : errorMessage(patient.error)}
        action={
          <Button variant="outline" asChild>
            <Link to="/patients">{t.common.back}</Link>
          </Button>
        }
      />
    )
  }

  const p = patient.data
  const facts = [
    [t.review.patientId, p.patient_code],
    [t.review.phone, p.phone && formatBDPhone(p.phone)],
    [t.review.age, p.age_years],
    [t.review.sex, p.sex && t.sex[p.sex]],
  ] as const

  return (
    <>
      <PageHeader
        title={p.full_name}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/patients" aria-label={t.common.back}>
                <ArrowLeftIcon />
                {/* Icon only on phones, so the actions fit on one line. */}
                <span className="hidden sm:inline">{t.common.back}</span>
              </Link>
            </Button>
            {can(user, 'patients:edit') && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <PencilIcon />
                {t.patients.edit}
              </Button>
            )}
            {can(user, 'prescriptions:scan') && (
              // Phones already have the camera button in the top bar.
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/scan">
                  <CameraIcon />
                  {t.nav.scan}
                </Link>
              </Button>
            )}
            {can(user, 'patients:delete') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t.patients.more}>
                    <EllipsisVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setDeleteOpen(true)}
                  >
                    <Trash2Icon />
                    {t.patients.deletePatient}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-5">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="truncate font-medium">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <EditPatientDialog patient={p} open={editOpen} onOpenChange={setEditOpen} />
      <DeletePatientDialog
        id={p.id}
        visits={history.data?.total ?? 0}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />

      <h2 className="mb-3 text-lg font-semibold">{t.patients.history}</h2>
      {history.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : history.data && history.data.items.length > 0 ? (
        <div className="space-y-4">
          {history.data.items.map((rx) => (
            <VisitCard key={rx.id} rx={rx} patientName={p.full_name} />
          ))}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={history.data.total}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <Card>
          <EmptyState icon={FileTextIcon} title={t.patients.noHistory} />
        </Card>
      )}
    </>
  )
}

function DeletePatientDialog({
  id,
  visits,
  open,
  onOpenChange,
}: {
  id: string
  visits: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const del = useDeletePatient(id)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.patients.deleteTitle}</DialogTitle>
          <DialogDescription>
            {visits > 0 ? t.patients.deleteBodyVisits : t.patients.deleteBody}
          </DialogDescription>
        </DialogHeader>
        {visits > 0 && (
          <p className="text-sm">
            {t.patients.prescriptionsToDelete} <span className="font-semibold">{visits}</span>
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            disabled={del.isPending}
            onClick={() =>
              del.mutate(undefined, {
                onSuccess: () => {
                  toast.success(t.patients.deleted)
                  navigate('/patients', { replace: true })
                },
                onError: (err) => toast.error(errorMessage(err)),
              })
            }
          >
            {t.patients.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function VisitCard({ rx, patientName }: { rx: PrescriptionSummary; patientName: string }) {
  const rows: [string, ReactNode][] = [
    [t.patients.complaint, rx.chief_complaint],
    [t.patients.diagnosis, rx.diagnosis],
    [t.patients.treatment, rx.procedures.length > 0 && <List items={rx.procedures} />],
    [
      t.patients.medicines,
      rx.medications.length > 0 && (
        <ul className="space-y-1">
          {rx.medications.map((m, i) => (
            <li key={i}>
              <span className="font-medium">{m.name}</span>
              {[m.dosage, m.frequency, m.duration, m.instructions].some(Boolean) && (
                <span className="text-muted-foreground">
                  {' — '}
                  {[m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      ),
    ],
    [t.patients.advice, rx.advice.length > 0 && <List items={rx.advice} />],
    [t.patients.notes, rx.notes],
  ]

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">{rx.visit_date ? formatDay(rx.visit_date) : '—'}</CardTitle>
        {rx.follow_up_date && (
          <Badge variant="accent" className="gap-1">
            <CalendarClockIcon className="size-3" />
            {t.patients.followUp} {formatDay(rx.follow_up_date)}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="sm:contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 whitespace-pre-line">{value}</dd>
              </div>
            ))}
        </dl>
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <SharePrescription id={rx.id} patientName={patientName} visitDate={rx.visit_date} size="sm" />
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/prescriptions/${rx.id}`}>
              <FileTextIcon />
              {t.patients.openPrescription}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-0.5 pl-4">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
