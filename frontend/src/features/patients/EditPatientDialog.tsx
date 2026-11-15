import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { errorMessage } from '@/api/client'
import type { Patient, PatientSex } from '@/api/types'
import { FormField } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'
import { isValidBDPhone } from '@/lib/phone'

import { useUpdatePatient } from './hooks'

const schema = z.object({
  full_name: z.string().trim().min(2, t.validation.required),
  phone: z.string().refine((v) => !v.trim() || isValidBDPhone(v), t.validation.phone),
  age_years: z.string().refine((v) => !v.trim() || /^\d{1,3}$/.test(v.trim()), t.validation.age),
  sex: z.enum(['', 'male', 'female', 'other']),
})

type FormValues = z.infer<typeof schema>

const selectClass =
  'flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring'

function toValues(p: Patient): FormValues {
  return {
    full_name: p.full_name,
    phone: p.phone ?? '',
    age_years: p.age_years != null ? String(p.age_years) : '',
    sex: p.sex ?? '',
  }
}

interface Props {
  patient: Patient
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPatientDialog({ patient, open, onOpenChange }: Props) {
  const mutation = useUpdatePatient(patient.id)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), values: toValues(patient) })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await mutation.mutateAsync({
        full_name: v.full_name.trim(),
        phone: v.phone.trim() || null,
        age_years: v.age_years.trim() ? Number(v.age_years) : null,
        sex: (v.sex || null) as PatientSex | null,
      })
      toast.success(t.patients.saved)
      onOpenChange(false)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(toValues(patient))
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.patients.editTitle}</DialogTitle>
          <DialogDescription>{t.patients.editHint}</DialogDescription>
        </DialogHeader>
        <form id="edit-patient" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="ep-name" label={t.review.fullName} error={errors.full_name?.message}>
            <Input id="ep-name" aria-invalid={!!errors.full_name} {...form.register('full_name')} />
          </FormField>
          <FormField id="ep-phone" label={t.review.phone} error={errors.phone?.message}>
            <Input
              id="ep-phone"
              type="tel"
              inputMode="tel"
              aria-invalid={!!errors.phone}
              {...form.register('phone')}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField id="ep-age" label={t.review.age} error={errors.age_years?.message}>
              <Input
                id="ep-age"
                inputMode="numeric"
                aria-invalid={!!errors.age_years}
                {...form.register('age_years')}
              />
            </FormField>
            <FormField id="ep-sex" label={t.review.sex}>
              <select id="ep-sex" className={selectClass} {...form.register('sex')}>
                <option value="">{t.review.notSet}</option>
                <option value="male">{t.sex.male}</option>
                <option value="female">{t.sex.female}</option>
                <option value="other">{t.sex.other}</option>
              </select>
            </FormField>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="edit-patient" disabled={mutation.isPending}>
            {mutation.isPending ? t.common.saving : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
