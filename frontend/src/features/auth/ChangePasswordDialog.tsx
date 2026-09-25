import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { ApiError, errorMessage } from '@/api/client'
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

import { useChangePassword } from './hooks'

const schema = z
  .object({
    current_password: z.string().min(1, t.validation.required),
    new_password: z.string().min(8, t.validation.passwordMin).max(128),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, {
    path: ['confirm'],
    message: t.validation.passwordsMatch,
  })

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const mutation = useChangePassword()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', confirm: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(async ({ current_password, new_password }) => {
    try {
      await mutation.mutateAsync({ current_password, new_password })
      toast.success(t.auth.passwordChanged)
      navigate('/login', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_password') {
        form.setError('current_password', { message: err.message })
      } else {
        toast.error(errorMessage(err))
      }
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.auth.changePassword}</DialogTitle>
          <DialogDescription>{t.auth.changePasswordHint}</DialogDescription>
        </DialogHeader>
        <form id="change-password" onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField id="current_password" label={t.auth.currentPassword} error={errors.current_password?.message}>
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.current_password}
              {...form.register('current_password')}
            />
          </FormField>
          <FormField id="new_password" label={t.auth.newPassword} error={errors.new_password?.message}>
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.new_password}
              {...form.register('new_password')}
            />
          </FormField>
          <FormField id="confirm" label={t.auth.confirmPassword} error={errors.confirm?.message}>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirm}
              {...form.register('confirm')}
            />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="change-password" disabled={mutation.isPending}>
            {mutation.isPending ? t.common.saving : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
