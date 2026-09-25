import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon, EyeIcon, EyeOffIcon, ShieldCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate, type Location } from 'react-router-dom'
import { z } from 'zod'

import { errorMessage } from '@/api/client'
import { FormField } from '@/components/common/FormField'
import { FullPageLoader } from '@/components/common/FullPageLoader'
import { Logo, ToothRootIcon } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCurrentUser, useLogin } from '@/features/auth/hooks'
import { t } from '@/i18n'

const schema = z.object({
  email: z.string().trim().min(1, t.validation.required).email(t.validation.email),
  password: z.string().min(1, t.validation.required),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { data: user, isPending } = useCurrentUser()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/'
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })
  const { errors } = form.formState

  if (isPending) return <FullPageLoader />
  if (user) return <Navigate to={from} replace />

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => navigate(from, { replace: true }) })
  })

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[oklch(0.52_0.1_184)] via-[oklch(0.58_0.1_182)] to-[oklch(0.62_0.08_215)] p-12 text-white lg:flex lg:flex-col">
        <Logo inverted />
        <div className="relative z-10 mt-auto max-w-md space-y-4">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            {t.app.headline}
          </h2>
          <p className="text-white/80">{t.app.tagline}</p>
        </div>
        <ToothRootIcon
          className="pointer-events-none absolute -right-24 -bottom-16 size-[460px] text-white/[0.07]"
          strokeWidth={0.6}
        />
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <Logo className="lg:hidden" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t.auth.signInTitle}</h1>
            <p className="text-sm text-muted-foreground">{t.auth.signInSubtitle}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {login.isError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                {errorMessage(login.error)}
              </div>
            )}

            <FormField id="email" label={t.auth.email} error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...form.register('email')}
              />
            </FormField>

            <FormField id="password" label={t.auth.password} error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </FormField>

            <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
              {login.isPending ? t.auth.signingIn : t.auth.signIn}
            </Button>
          </form>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheckIcon className="mt-px size-4 shrink-0 text-primary" />
            {t.auth.staffOnly}
          </p>
        </div>
      </div>
    </div>
  )
}
