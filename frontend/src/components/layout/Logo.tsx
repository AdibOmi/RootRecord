import type { SVGProps } from 'react'

import { t } from '@/i18n'
import { cn } from '@/lib/utils'

/** A molar outline with two roots — the Root Record mark. */
export function ToothRootIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8.5 3C6 3 4 5 4 7.6c0 2.2 1 3.7 1.8 5.2.8 1.5 1 3.2 1.2 5l.4 2.4c.2 1.1 1.6 1.1 1.9 0l1-4c.3-1.2.9-1.8 1.7-1.8s1.4.6 1.7 1.8l1 4c.3 1.1 1.7 1.1 1.9 0l.4-2.4c.2-1.8.4-3.5 1.2-5 .8-1.5 1.8-3 1.8-5.2C20 5 18 3 15.5 3c-1.3 0-2.4.6-3.5 1.2C10.9 3.6 9.8 3 8.5 3Z" />
      <path d="M9 7.5c.9-.5 2-.5 3 .2 1-.7 2.1-.7 3-.2" opacity={0.55} />
    </svg>
  )
}

interface LogoProps {
  /** Hide the wordmark (collapsed sidebar). */
  compact?: boolean
  className?: string
  inverted?: boolean
}

export function Logo({ compact = false, className, inverted = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-xl shadow-sm',
          inverted ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-primary text-primary-foreground',
        )}
      >
        <ToothRootIcon className="size-5" />
      </div>
      {!compact && (
        <span
          className={cn(
            'text-lg font-semibold tracking-tight',
            inverted ? 'text-white' : 'text-foreground',
          )}
        >
          Root<span className={inverted ? 'text-white/75' : 'text-primary'}>Record</span>
          <span className="sr-only">{t.app.name}</span>
        </span>
      )}
    </div>
  )
}
