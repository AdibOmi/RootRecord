import { Logo } from '@/components/layout/Logo'
import { t } from '@/i18n'

export function FullPageLoader() {
  return (
    <div className="grid min-h-full place-items-center" role="status" aria-live="polite">
      <div className="flex animate-pulse flex-col items-center gap-3">
        <Logo />
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </div>
  )
}
