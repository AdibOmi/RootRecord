import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BadgeCheckIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  FileQuestionIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  Trash2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useFieldArray, useForm, type UseFormReturn } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ApiError, errorMessage } from '@/api/client'
import type { PatientRef, PrescriptionDetail } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { FormField } from '@/components/common/FormField'
import { PageHeader } from '@/components/common/PageHeader'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/features/auth/hooks'
import { FiledVisitCard } from '@/features/prescriptions/FiledVisitCard'
import {
  clinicalSchema,
  type ClinicalValues,
  isUncertain,
  toClinicalValues,
  toSaveInput,
} from '@/features/prescriptions/form'
import {
  useDeletePrescription,
  useExtractAgain,
  usePrescription,
  useSavePrescription,
} from '@/features/prescriptions/hooks'
import { PatientIdDialog } from '@/features/prescriptions/PatientIdDialog'
import { RegisterCard } from '@/features/prescriptions/RegisterCard'
import { SharePrescription } from '@/features/prescriptions/SharePrescription'
import { t } from '@/i18n'
import { formatDateTime } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'

export function PrescriptionReviewPage() {
  const { id = '' } = useParams()
  const query = usePrescription(id)

  if (query.isPending) return <ReviewSkeleton />
  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404
    return (
      <EmptyState
        className="mt-16"
        icon={FileQuestionIcon}
        title={missing ? t.notFound.title : t.common.somethingWrong}
        description={missing ? t.review.notFound : errorMessage(query.error)}
        action={
          <Button variant="outline" asChild>
            <Link to="/prescriptions">{t.common.back}</Link>
          </Button>
        }
      />
    )
  }
  return <PrescriptionReview key={query.data.id} prescription={query.data} />
}

function PrescriptionReview({ prescription: p }: { prescription: PrescriptionDetail }) {
  const user = useUser()
  const navigate = useNavigate()
  const canScan = can(user, 'prescriptions:scan')
  const isDentist = can(user, 'clinical:edit')
  const isDraft = p.status === 'draft'
  const canDelete = isDraft ? canScan : user.role === 'admin'

  const extractAgain = useExtractAgain(p.id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [changingPatient, setChangingPatient] = useState(false)
  // Set right after filing, to show the ID to write on the paper.
  const [justFiled, setJustFiled] = useState<{ patient: PatientRef; isNew: boolean } | null>(null)

  return (
    <>
      <PageHeader
        title={isDraft ? t.review.titleDraft : t.review.titleFiled}
        description={isDraft ? t.review.descriptionDraft : t.review.descriptionFiled}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to={p.patient ? `/patients/${p.patient.id}` : '/prescriptions'} aria-label={t.common.back}>
                <ArrowLeftIcon />
                <span className="hidden sm:inline">{t.common.back}</span>
              </Link>
            </Button>
            {!isDraft && p.patient && (
              <SharePrescription id={p.id} patientName={p.patient.full_name} visitDate={p.visit_date} />
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* On phones, filing at the counter comes first; the photo follows. */}
        <div className={cn('space-y-3 lg:sticky lg:top-24 lg:self-start', isDraft && 'order-2 lg:order-none')}>
          <PhotoViewer srcs={p.image_urls} compact={isDraft} />
          <p className="text-xs text-muted-foreground">
            {t.review.scannedBy} {p.created_by.full_name}, {formatDateTime(p.created_at)}
            {p.confirmed_by && p.confirmed_at && (
              <>
                {' · '}
                {t.review.filedBy} {p.confirmed_by.full_name}, {formatDateTime(p.confirmed_at)}
              </>
            )}
          </p>
        </div>

        <div className="space-y-6">
          {isDraft || changingPatient ? (
            canScan && (
              <RegisterCard
                prescription={p}
                mode={isDraft ? 'file' : 'change'}
                onCancel={changingPatient ? () => setChangingPatient(false) : undefined}
                onDone={(saved, isNew) => {
                  setChangingPatient(false)
                  if (isDraft && saved.patient) setJustFiled({ patient: saved.patient, isNew })
                  else toast.success(t.review.patientChanged)
                }}
              />
            )
          ) : (
            <FiledVisitCard
              prescription={p}
              canEdit={canScan}
              onChangePatient={() => setChangingPatient(true)}
            />
          )}

          {p.reading && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm"
            >
              <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
              <div>
                <p className="font-medium">{t.review.reading}</p>
                <p className="text-muted-foreground">{t.review.readingHint}</p>
              </div>
            </div>
          )}

          {p.extraction_error && (
            <div
              role="alert"
              className="flex flex-wrap items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm"
            >
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-destructive">{t.review.readFailed}</p>
                <p className="text-muted-foreground">{p.extraction_error}</p>
              </div>
              {!p.verified && canScan && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={extractAgain.isPending}
                  onClick={() =>
                    extractAgain.mutate(undefined, {
                      onError: (err) => toast.error(errorMessage(err)),
                    })
                  }
                >
                  <RefreshCwIcon className={cn(extractAgain.isPending && 'animate-spin')} />
                  {extractAgain.isPending ? t.review.readingAgain : t.review.readAgain}
                </Button>
              )}
            </div>
          )}

          {!isDraft && <VerificationNotice prescription={p} />}

          {/* Remount when reading finishes so the form picks up what was read. */}
          <ClinicalForm
            key={`${p.reading}`}
            prescription={p}
            editable={isDentist && !isDraft && !p.reading}
          />

          {canDelete && (
            <div className="border-t pt-6">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon />
                {isDraft ? t.review.discard : t.review.delete}
              </Button>
            </div>
          )}
        </div>
      </div>

      <PatientIdDialog
        patient={justFiled?.patient ?? null}
        isNew={justFiled?.isNew ?? false}
        onClose={() => setJustFiled(null)}
        onScanNext={() => navigate('/scan')}
      />
      <DeleteDialog
        id={p.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate(p.patient ? `/patients/${p.patient.id}` : '/prescriptions')}
      />
    </>
  )
}

function VerificationNotice({ prescription: p }: { prescription: PrescriptionDetail }) {
  if (p.verified && p.verified_by && p.verified_at) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/5 p-3 text-sm">
        <BadgeCheckIcon className="size-4 shrink-0 text-success" />
        {t.review.checkedBy} {p.verified_by.full_name}, {formatDateTime(p.verified_at)}
      </p>
    )
  }
  return (
    <div className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm">
      <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-[oklch(0.45_0.1_65)]" />
      <div>
        <p className="font-medium">{t.review.notChecked}</p>
        <p className="text-muted-foreground">{t.review.notCheckedHint}</p>
      </div>
    </div>
  )
}

type Check = (path: string) => ReactNode

interface SectionProps {
  form: UseFormReturn<ClinicalValues>
  check: Check
}

/** What was read from the prescription; dentists check and correct it. */
function ClinicalForm({ prescription: p, editable }: { prescription: PrescriptionDetail; editable: boolean }) {
  const form = useForm<ClinicalValues>({
    resolver: zodResolver(clinicalSchema),
    defaultValues: toClinicalValues(p),
  })
  const save = useSavePrescription(p.id)
  const uncertain = p.extracted?.uncertain_fields ?? []

  const check = (path: string) =>
    !p.verified && isUncertain(uncertain, path) ? (
      <Badge variant="warning" className="gap-1">
        <AlertTriangleIcon className="size-3" />
        {t.review.check}
      </Badge>
    ) : null

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(toSaveInput(values), {
      onSuccess: () => toast.success(t.review.checkedSaved),
      onError: (err) => {
        const details = err instanceof ApiError ? err.fieldErrors.map((d) => d.message) : []
        toast.error([errorMessage(err), ...details].join(' — '))
      },
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {p.status === 'draft' && !p.reading && (
        <p className="text-sm text-muted-foreground">{t.review.clinicalAfterFiling}</p>
      )}
      {editable && !p.verified && uncertain.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[oklch(0.45_0.1_65)]" />
          {t.review.uncertainNotice}
        </p>
      )}

      <fieldset disabled={!editable} className={cn('space-y-6', p.reading && 'opacity-60')}>
        <VisitSection form={form} check={check} />
        <MedicinesSection form={form} check={check} />
      </fieldset>

      {editable && (
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={save.isPending}>
            <CheckIcon />
            {save.isPending ? t.common.saving : p.verified ? t.review.saveChanges : t.review.markChecked}
          </Button>
        </div>
      )}
    </form>
  )
}

function VisitSection({ form, check }: SectionProps) {
  const { errors } = form.formState
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.review.visit}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="visit_date"
            label={t.review.visitDate}
            error={errors.visit_date?.message}
            badge={check('visit_date')}
          >
            <Input
              id="visit_date"
              type="date"
              aria-invalid={!!errors.visit_date}
              {...form.register('visit_date')}
            />
          </FormField>
          <FormField
            id="follow_up_date"
            label={t.review.followUpDate}
            error={errors.follow_up_date?.message}
            badge={check('follow_up_date')}
          >
            <Input
              id="follow_up_date"
              type="date"
              aria-invalid={!!errors.follow_up_date}
              {...form.register('follow_up_date')}
            />
          </FormField>
        </div>
        <FormField id="chief_complaint" label={t.review.chiefComplaint} badge={check('chief_complaint')}>
          <Textarea id="chief_complaint" rows={2} {...form.register('chief_complaint')} />
        </FormField>
        <FormField id="diagnosis" label={t.review.diagnosis} badge={check('diagnosis')}>
          <Textarea id="diagnosis" rows={2} {...form.register('diagnosis')} />
        </FormField>
        <FormField
          id="procedures"
          label={t.review.procedures}
          hint={t.review.onePerLine}
          badge={check('procedures')}
        >
          <Textarea id="procedures" rows={3} {...form.register('procedures')} />
        </FormField>
      </CardContent>
    </Card>
  )
}

function MedicinesSection({ form, check }: SectionProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'medications' })
  const { errors } = form.formState

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>{t.review.medicines}</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            append({ name: '', dosage: '', frequency: '', duration: '', instructions: '' })
          }
        >
          <PlusIcon />
          {t.review.addMedicine}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.review.noMedicines}</p>
        )}
        {fields.map((field, i) => (
          <div key={field.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField
                  id={`med-${i}-name`}
                  label={t.review.medicineName}
                  error={errors.medications?.[i]?.name?.message}
                  badge={check(`medications.${i}.name`)}
                >
                  <Input
                    id={`med-${i}-name`}
                    aria-invalid={!!errors.medications?.[i]?.name}
                    {...form.register(`medications.${i}.name`)}
                  />
                </FormField>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t.review.removeMedicine}
                onClick={() => remove(i)}
              >
                <Trash2Icon />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['dosage', 'frequency', 'duration', 'instructions'] as const).map((key) => (
                <FormField
                  key={key}
                  id={`med-${i}-${key}`}
                  label={t.review[key]}
                  badge={check(`medications.${i}.${key}`)}
                >
                  <Input id={`med-${i}-${key}`} {...form.register(`medications.${i}.${key}`)} />
                </FormField>
              ))}
            </div>
          </div>
        ))}

        <FormField id="advice" label={t.review.advice} hint={t.review.onePerLine} badge={check('advice')}>
          <Textarea id="advice" rows={3} {...form.register('advice')} />
        </FormField>
        <FormField id="notes" label={t.review.notes} badge={check('notes')}>
          <Textarea id="notes" rows={2} {...form.register('notes')} />
        </FormField>
      </CardContent>
    </Card>
  )
}

function PhotoViewer({ srcs, compact = false }: { srcs: string[]; compact?: boolean }) {
  const [zoomed, setZoomed] = useState(false)
  const [index, setIndex] = useState(0)
  const src = srcs[Math.min(index, srcs.length - 1)]
  const turn = (by: number) => {
    setIndex((i) => i + by)
    setZoomed(false)
  }
  return (
    <Card className="overflow-hidden">
      <div className={cn('bg-muted', zoomed ? 'max-h-[75vh] overflow-auto' : 'overflow-hidden')}>
        <img
          src={src}
          alt=""
          className={cn(
            'mx-auto',
            zoomed
              ? 'max-w-none cursor-zoom-out'
              : cn(
                  'w-full cursor-zoom-in object-contain lg:max-h-[75vh]',
                  compact ? 'max-h-[40vh]' : 'max-h-[60vh]',
                ),
          )}
          onClick={() => setZoomed((z) => !z)}
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t p-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setZoomed((z) => !z)}>
          {zoomed ? <ZoomOutIcon /> : <ZoomInIcon />}
          {zoomed ? t.review.zoomOut : t.review.zoomIn}
        </Button>
        {srcs.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t.review.previousPage}
              disabled={index === 0}
              onClick={() => turn(-1)}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="text-xs whitespace-nowrap text-muted-foreground" aria-live="polite">
              {t.common.page} {index + 1} {t.common.of} {srcs.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t.review.nextPage}
              disabled={index >= srcs.length - 1}
              onClick={() => turn(1)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        )}
        <Button variant="ghost" size="sm" asChild>
          <a href={src} target="_blank" rel="noreferrer">
            <ExternalLinkIcon />
            {t.review.openFull}
          </a>
        </Button>
      </div>
    </Card>
  )
}

function DeleteDialog({
  id,
  open,
  onOpenChange,
  onDeleted,
}: {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const del = useDeletePrescription(id)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.review.deleteTitle}</DialogTitle>
          <DialogDescription>{t.review.deleteBody}</DialogDescription>
        </DialogHeader>
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
                  toast.success(t.review.deleted)
                  onDeleted()
                },
                onError: (err) => toast.error(errorMessage(err)),
              })
            }
          >
            {t.review.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewSkeleton() {
  return (
    <>
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Skeleton className="h-[60vh] w-full" />
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </>
  )
}
