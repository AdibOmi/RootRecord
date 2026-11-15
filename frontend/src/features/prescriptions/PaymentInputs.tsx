import type { UseFormRegisterReturn } from 'react-hook-form'

import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'
import { formatBDT } from '@/lib/format'

interface Props {
  idPrefix: string
  billed: UseFormRegisterReturn
  paid: UseFormRegisterReturn
  billedError?: string
  paidError?: string
  /** Minor units, or null while no bill is entered. */
  due: number | null
}

/** Bill and amount paid for one visit, with what is still due. */
export function PaymentInputs({ idPrefix, billed, paid, billedError, paidError, due }: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <FormField id={`${idPrefix}-billed`} label={t.payment.billed} error={billedError}>
          <Input
            id={`${idPrefix}-billed`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            aria-invalid={!!billedError}
            {...billed}
          />
        </FormField>
        <FormField id={`${idPrefix}-paid`} label={t.payment.paid} error={paidError}>
          <Input
            id={`${idPrefix}-paid`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            aria-invalid={!!paidError}
            {...paid}
          />
        </FormField>
      </div>
      <p className="text-sm" aria-live="polite">
        {due === null ? (
          <span className="text-muted-foreground">{t.payment.noBill}</span>
        ) : due === 0 ? (
          <span className="font-medium text-success">{t.payment.paidInFull}</span>
        ) : (
          <>
            <span className="text-muted-foreground">{t.payment.due}: </span>
            <span className="font-semibold text-destructive">{formatBDT(due)}</span>
          </>
        )}
      </p>
    </div>
  )
}
