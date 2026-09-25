import * as React from 'react'

import { cn } from '@/lib/utils'

type DivProps = React.HTMLAttributes<HTMLDivElement>

function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={cn('rounded-xl border bg-card text-card-foreground shadow-xs', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn('flex flex-col gap-1.5 p-6 pb-3', className)} {...props} />
}

function CardTitle({ className, ...props }: DivProps) {
  return <div className={cn('text-base leading-none font-semibold', className)} {...props} />
}

function CardDescription({ className, ...props }: DivProps) {
  return <div className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function CardContent({ className, ...props }: DivProps) {
  return <div className={cn('p-6 pt-3', className)} {...props} />
}

function CardFooter({ className, ...props }: DivProps) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
