import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightLeftIcon, UserIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { errorMessage } from '@/api/client'
import type { PrescriptionDetail } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { t } from '@/i18n'
import { formatPatientCode } from '@/lib/format'

import { amountDue, paymentSchema, type PaymentValues, toPaymentInput, toPaymentValues } from './form'
import { useSetPayment } from './hooks'
import { PaymentInputs } from './PaymentInputs'

interface Props {
  prescription: PrescriptionDetail
  canEdit: boolean
  onChangePatient: () => void
}

/** Who the visit is filed under (with the ID to write on the paper) and its payment. */
export function FiledVisitCard({ prescription: p, canEdit, onChangePatient }: Props) {
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    values: toPaymentValues(p),
  })
  const setPayment = useSetPayment(p.id)
  const { errors, isDirty } = form.formState
  const patient = p.patient
  if (!patient) return null

  const onSubmit = form.handleSubmit((values) =>
    setPayment.mutate(toPaymentInput(values), {
      onSuccess: () => toast.success(t.payment.saved),
      onError: (err) => toast.error(errorMessage(err)),
    }),
  )

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/patients/${patient.id}`}
              className="inline-flex items-center gap-1.5 text-lg font-semibold hover:underline"
            >
              <UserIcon className="size-4 text-muted-foreground" />
              {patient.full_name}
            </Link>
            <p className="text-xs text-muted-foreground">{t.review.patientIdBig}</p>
            <p className="font-mono text-2xl font-bold tracking-wider">
              {formatPatientCode(patient.patient_code)}
            </p>
          </div>
          {canEdit && (
            <Button type="button" variant="ghost" size="sm" onClick={onChangePatient}>
              <ArrowRightLeftIcon />
              {t.review.changePatient}
            </Button>
          )}
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">{t.payment.title}</h3>
          <fieldset disabled={!canEdit} className="space-y-3">
            <PaymentInputs
              idPrefix="pay"
              billed={form.register('billed')}
              paid={form.register('paid')}
              billedError={errors.billed?.message}
              paidError={errors.paid?.message}
              due={amountDue(form.watch())}
            />
          </fieldset>
          {canEdit && isDirty && (
            <Button type="submit" size="sm" disabled={setPayment.isPending}>
              {setPayment.isPending ? t.common.saving : t.payment.save}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
