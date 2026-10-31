import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  FileQuestionIcon,
  HourglassIcon,
  Loader2Icon,
  PhoneOffIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useFieldArray, useForm, type UseFormReturn } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ApiError, errorMessage } from '@/api/client'
import type { Patient, PatientRef, PrescriptionDetail } from '@/api/types'
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
import { usePatients } from '@/features/patients/hooks'
import {
  isUncertain,
  NEW_PATIENT,
  reviewSchema,
  toFormValues,
  toSaveInput,
  type ReviewValues,
} from '@/features/prescriptions/form'
import {
  useDeletePrescription,
  useExtractAgain,
  usePrescription,
  useSavePrescription,
} from '@/features/prescriptions/hooks'
import { SharePrescription } from '@/features/prescriptions/SharePrescription'
import { t } from '@/i18n'
import { formatDateTime } from '@/lib/format'
import { can } from '@/lib/permissions'
import { formatBDPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

const selectClass =
  'flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring'

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
  // Remount when reading finishes so the form picks up what was read.
  return <PrescriptionReview key={`${query.data.id}:${query.data.reading}`} prescription={query.data} />
}

function PrescriptionReview({ prescription: p }: { prescription: PrescriptionDetail }) {
  const user = useUser()
  const navigate = useNavigate()
  // Assistants upload and can re-read or discard drafts; only dentists file them.
  const editable = can(user, 'clinical:edit')
  const canScan = can(user, 'prescriptions:scan')
  const isDraft = p.status === 'draft'
  const reading = p.reading
  const canDelete = isDraft ? canScan : user.role === 'admin'
  const uncertain = p.extracted?.uncertain_fields ?? []

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: toFormValues(p),
  })
  const save = useSavePrescription(p.id)
  const extractAgain = useExtractAgain(p.id)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(toSaveInput(values), {
      onSuccess: (saved) => {
        toast.success(t.review.saved, {
          action: { label: t.review.scanNext, onClick: () => navigate('/scan') },
        })
        if (saved.patient) navigate(`/patients/${saved.patient.id}`)
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'patient_code_taken') {
          form.setError('newPatient.patient_code', { message: err.message })
        } else {
          const details = err instanceof ApiError ? err.fieldErrors.map((d) => d.message) : []
          toast.error([errorMessage(err), ...details].join(' — '))
        }
      },
    })
  })

  const check = (path: string) =>
    isDraft && isUncertain(uncertain, path) ? (
      <Badge variant="warning" className="gap-1">
        <AlertTriangleIcon className="size-3" />
        {t.review.check}
      </Badge>
    ) : null

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
        <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <PhotoViewer srcs={p.image_urls} />
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

        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {reading && (
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

          {isDraft && !editable && !reading && (
            <p className="flex items-start gap-2 rounded-lg border bg-secondary/50 p-3 text-sm">
              <HourglassIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {t.review.awaitingDentist}
            </p>
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
              {isDraft && canScan && (
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

          {isDraft && !reading && uncertain.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[oklch(0.45_0.1_65)]" />
              {t.review.uncertainNotice}
            </p>
          )}

          <fieldset disabled={!editable || reading} className={cn('space-y-6', reading && 'opacity-60')}>
            <PatientSection form={form} prescription={p} check={check} />
            <VisitSection form={form} check={check} />
            <MedicinesSection form={form} check={check} />
          </fieldset>

          {(editable || canDelete) && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon />
                  {isDraft ? t.review.discard : t.review.delete}
                </Button>
              ) : (
                <span />
              )}
              {editable && (
                <Button type="submit" size="lg" disabled={save.isPending || reading}>
                  <CheckIcon />
                  {save.isPending ? t.common.saving : isDraft ? t.review.save : t.review.saveChanges}
                </Button>
              )}
            </div>
          )}
        </form>
      </div>

      <DeleteDialog
        id={p.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate(p.patient ? `/patients/${p.patient.id}` : '/prescriptions')}
      />
    </>
  )
}

type Check = (path: string) => ReactNode

interface SectionProps {
  form: UseFormReturn<ReviewValues>
  check: Check
}

function PatientSection({
  form,
  prescription: p,
  check,
}: SectionProps & { prescription: PrescriptionDetail }) {
  const choice = form.watch('patientChoice')
  const { errors } = form.formState
  // Patients picked through search, kept so they stay listed once chosen.
  const [picked, setPicked] = useState<PatientRef[]>([])

  const options: (PatientRef & Partial<Patient> & { reasons?: string[] })[] = [
    ...(p.patient ? [p.patient] : []),
    ...p.patient_matches.map((m) => ({ ...m.patient, reasons: m.reasons })),
    ...picked,
  ].filter((o, i, all) => all.findIndex((x) => x.id === o.id) === i)

  const [searching, setSearching] = useState(false)
  const choose = (id: string) =>
    form.setValue('patientChoice', id, { shouldDirty: true, shouldValidate: true })
  // `phone` is undefined when unknown (a bare PatientRef), null when the patient has none.
  const chosenWithoutPhone = options.find((o) => o.id === choice)?.phone === null
  const newPatientPhone = form.watch('newPatient.phone')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.review.patient}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!p.patient && p.patient_matches.length > 0 && (
          <p className="text-sm text-muted-foreground">{t.review.matchesHint}</p>
        )}

        {/* With no likely match there is nothing to choose: go straight to the new patient's details. */}
        {options.length > 0 && (
          <div role="radiogroup" aria-label={t.review.patient} className="space-y-2">
            {options.map((o) => (
              <ChoiceCard key={o.id} selected={choice === o.id} onSelect={() => choose(o.id)}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{o.full_name}</span>
                  <span className="text-xs text-muted-foreground">{o.patient_code}</span>
                  {o.reasons?.map((r) => (
                    <Badge key={r} variant="accent">
                      {r}
                    </Badge>
                  ))}
                </div>
                {(o.phone || o.age_years != null) && (
                  <p className="text-xs text-muted-foreground">
                    {[o.phone && formatBDPhone(o.phone), o.age_years != null && `${o.age_years} ${t.patients.years}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </ChoiceCard>
            ))}

            <ChoiceCard selected={choice === NEW_PATIENT} onSelect={() => choose(NEW_PATIENT)}>
              <div className="flex items-center gap-2">
                <UserPlusIcon className="size-4 text-primary" />
                <span className="font-medium">{t.review.newPatient}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.review.newPatientHint}</p>
            </ChoiceCard>
          </div>
        )}

        {errors.patientChoice && (
          <p className="text-xs text-destructive" role="alert">
            {errors.patientChoice.message}
          </p>
        )}

        {chosenWithoutPhone && <PhoneWarning>{t.review.noPhoneExisting}</PhoneWarning>}

        {choice === NEW_PATIENT && (
          <div className={cn('grid gap-4 sm:grid-cols-2', options.length > 0 && 'border-t pt-4')}>
            <FormField
              id="np-name"
              label={t.review.fullName}
              error={errors.newPatient?.full_name?.message}
              badge={check('patient.full_name')}
            >
              <Input
                id="np-name"
                aria-invalid={!!errors.newPatient?.full_name}
                {...form.register('newPatient.full_name')}
              />
            </FormField>
            <FormField
              id="np-code"
              label={t.review.patientId}
              hint={t.review.patientIdHint}
              error={errors.newPatient?.patient_code?.message}
              badge={check('patient.patient_id')}
            >
              <Input
                id="np-code"
                aria-invalid={!!errors.newPatient?.patient_code}
                {...form.register('newPatient.patient_code')}
              />
            </FormField>
            <FormField
              id="np-phone"
              label={t.review.phone}
              error={errors.newPatient?.phone?.message}
              badge={check('patient.phone')}
            >
              <Input
                id="np-phone"
                type="tel"
                inputMode="tel"
                aria-invalid={!!errors.newPatient?.phone}
                {...form.register('newPatient.phone')}
              />
              {!newPatientPhone.trim() && !errors.newPatient?.phone && (
                <PhoneWarning>{t.review.noPhone}</PhoneWarning>
              )}
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="np-age"
                label={t.review.age}
                error={errors.newPatient?.age_years?.message}
                badge={check('patient.age_years')}
              >
                <Input
                  id="np-age"
                  inputMode="numeric"
                  aria-invalid={!!errors.newPatient?.age_years}
                  {...form.register('newPatient.age_years')}
                />
              </FormField>
              <FormField id="np-sex" label={t.review.sex} badge={check('patient.sex')}>
                <select id="np-sex" className={selectClass} {...form.register('newPatient.sex')}>
                  <option value="">{t.review.notSet}</option>
                  <option value="male">{t.sex.male}</option>
                  <option value="female">{t.sex.female}</option>
                  <option value="other">{t.sex.other}</option>
                </select>
              </FormField>
            </div>
          </div>
        )}

        {searching ? (
          <PatientSearch
            onPick={(patient) => {
              setPicked((prev) => [...prev, patient])
              choose(patient.id)
              setSearching(false)
            }}
            onCancel={() => setSearching(false)}
          />
        ) : (
          <Button
            type="button"
            variant="link"
            className="h-auto px-0"
            onClick={() => setSearching(true)}
          >
            <SearchIcon />
            {options.length > 0 ? t.review.chooseOther : t.review.chooseExisting}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function PhoneWarning({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-[oklch(0.45_0.1_65)]">
      <PhoneOffIcon className="mt-px size-3.5 shrink-0" />
      {children}
    </p>
  )
}

function ChoiceCard({
  selected,
  onSelect,
  children,
}: {
  selected: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
        'hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
        selected && 'border-primary bg-primary/5 hover:bg-primary/5',
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
          selected && 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {selected && <CheckIcon className="size-3" />}
      </span>
      <span className="min-w-0 flex-1 space-y-1">{children}</span>
    </button>
  )
}

function PatientSearch({
  onPick,
  onCancel,
}: {
  onPick: (patient: PatientRef) => void
  onCancel: () => void
}) {
  const [q, setQ] = useState('')
  const search = q.trim()
  const results = usePatients({ q: search, page_size: 5 }, search.length >= 2)

  return (
    <div className="relative border-t pt-3">
      <SearchIcon className="pointer-events-none absolute top-6 left-3 size-4 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.review.findPatient}
        className="pr-10 pl-9"
        aria-label={t.review.findPatient}
        autoFocus
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-3 right-0"
        aria-label={t.common.cancel}
        onClick={onCancel}
      >
        <XIcon />
      </Button>
      {search.length >= 2 && results.data && (
        <ul className="mt-2 divide-y rounded-lg border">
          {results.data.items.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">{t.patients.noResults}</li>
          )}
          {results.data.items.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                className="w-full p-3 text-left text-sm hover:bg-muted/60"
                onClick={() => onPick(patient)}
              >
                <span className="font-medium">{patient.full_name}</span>{' '}
                <span className="text-xs text-muted-foreground">
                  {patient.patient_code}
                  {patient.phone && ` · ${formatBDPhone(patient.phone)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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

function PhotoViewer({ srcs }: { srcs: string[] }) {
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
            zoomed ? 'max-w-none cursor-zoom-out' : 'max-h-[60vh] w-full cursor-zoom-in object-contain lg:max-h-[75vh]',
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
