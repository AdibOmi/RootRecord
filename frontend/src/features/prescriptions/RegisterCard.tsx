import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangleIcon,
  CheckIcon,
  PhoneOffIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { ApiError, errorMessage } from '@/api/client'
import type { MatchReason, Patient, PatientRef, PrescriptionDetail } from '@/api/types'
import { FormField } from '@/components/common/FormField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePatients } from '@/features/patients/hooks'
import { t } from '@/i18n'
import { formatPatientCode } from '@/lib/format'
import { formatBDPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

import {
  amountDue,
  isUncertain,
  NEW_PATIENT,
  registerSchema,
  type RegisterValues,
  toRegisterInput,
  toRegisterValues,
} from './form'
import { useRegisterPrescription } from './hooks'
import { PaymentInputs } from './PaymentInputs'

export const selectClass =
  'flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring'

/** A patient to choose from: the filed one, a suggested match, or one found by search. */
type Option = PatientRef & Partial<Patient> & { reasons?: MatchReason[]; strong?: boolean }

interface Props {
  prescription: PrescriptionDetail
  /** "file": a new scan at payment. "change": move a filed visit to another patient. */
  mode: 'file' | 'change'
  onDone: (saved: PrescriptionDetail, newPatient: boolean) => void
  onCancel?: () => void
}

/**
 * The assistant's step at payment: confirm who the patient is (an existing one,
 * suggested from what was read, or a new one) and enter the bill.
 */
export function RegisterCard({ prescription: p, mode, onDone, onCancel }: Props) {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: toRegisterValues(p),
  })
  const register = useRegisterPrescription(p.id)
  const { errors } = form.formState
  const choice = form.watch('patientChoice')
  const payment = form.watch('payment')
  const uncertain = p.extracted?.uncertain_fields ?? []
  const headerUnread = !p.extracted?.patient?.full_name && !p.extracted?.patient?.phone

  // Patients picked through search, kept so they stay listed once chosen.
  const [picked, setPicked] = useState<PatientRef[]>([])
  const [searching, setSearching] = useState(false)

  const options: Option[] = [
    ...(p.patient ? [p.patient] : []),
    ...p.patient_matches.map((m) => ({ ...m.patient, reasons: m.reasons, strong: m.strong })),
    ...picked,
  ].filter((o, i, all) => all.findIndex((x) => x.id === o.id) === i)

  const choose = (id: string) =>
    form.setValue('patientChoice', id, { shouldDirty: true, shouldValidate: true })
  const chosen = options.find((o) => o.id === choice)
  // `phone` is undefined when unknown (a bare PatientRef), null when the patient has none.
  const chosenWithoutPhone = chosen?.phone === null
  const newPatientPhone = form.watch('newPatient.phone')

  const check = (path: string) =>
    isUncertain(uncertain, path) ? (
      <Badge variant="warning" className="gap-1">
        <AlertTriangleIcon className="size-3" />
        {t.review.check}
      </Badge>
    ) : null

  const onSubmit = form.handleSubmit((values) => {
    const body = toRegisterInput(values)
    register.mutate(body, {
      onSuccess: (saved) => onDone(saved, values.patientChoice === NEW_PATIENT),
      onError: (err) => {
        const details = err instanceof ApiError ? err.fieldErrors.map((d) => d.message) : []
        toast.error([errorMessage(err), ...details].join(' — '))
      },
    })
  })

  return (
    <Card className={cn(mode === 'file' && 'border-primary/40 shadow-md')}>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>{mode === 'file' ? t.review.patient : t.review.changePatient}</CardTitle>
        {onCancel && (
          <Button type="button" variant="ghost" size="icon" aria-label={t.common.cancel} onClick={onCancel}>
            <XIcon />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {mode === 'file' && headerUnread && (
            <p className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[oklch(0.45_0.1_65)]" />
              {t.review.headerUnread}
            </p>
          )}
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
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatPatientCode(o.patient_code)}
                    </span>
                    {o.reasons?.map((r) => (
                      <Badge key={r} variant={o.strong ? 'success' : 'accent'}>
                        {t.review.reasons[r]}
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
                  {o.strong === false && o.reasons?.length === 1 && o.reasons[0] === 'same_phone' && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <UsersIcon className="mt-px size-3.5 shrink-0" />
                      {t.review.samePhoneOnly}
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
                  autoComplete="off"
                  aria-invalid={!!errors.newPatient?.full_name}
                  {...form.register('newPatient.full_name')}
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
                  autoComplete="off"
                  aria-invalid={!!errors.newPatient?.phone}
                  {...form.register('newPatient.phone')}
                />
                {!newPatientPhone.trim() && !errors.newPatient?.phone && (
                  <PhoneWarning>{t.review.noPhone}</PhoneWarning>
                )}
              </FormField>
              <FormField
                id="np-age"
                label={t.review.age}
                error={errors.newPatient?.age_years?.message}
                badge={check('patient.age_years')}
              >
                <Input
                  id="np-age"
                  inputMode="numeric"
                  autoComplete="off"
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
            <Button type="button" variant="link" className="h-auto px-0" onClick={() => setSearching(true)}>
              <SearchIcon />
              {options.length > 0 ? t.review.chooseOther : t.review.chooseExisting}
            </Button>
          )}

          {mode === 'file' && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">{t.payment.title}</h3>
              <PaymentInputs
                idPrefix="reg"
                billed={form.register('payment.billed')}
                paid={form.register('payment.paid')}
                billedError={errors.payment?.billed?.message}
                paidError={errors.payment?.paid?.message}
                due={amountDue(payment)}
              />
            </div>
          )}

          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={register.isPending}>
            <CheckIcon />
            {register.isPending ? t.review.filing : mode === 'file' ? t.review.fileVisit : t.common.save}
          </Button>
        </form>
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
                  {formatPatientCode(patient.patient_code)}
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
