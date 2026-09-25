import { CompassIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'

export function NotFoundPage() {
  return (
    <EmptyState
      className="mt-16"
      icon={CompassIcon}
      title={t.notFound.title}
      description={t.notFound.body}
      action={
        <Button asChild>
          <Link to="/">{t.placeholder.backToDashboard}</Link>
        </Button>
      }
    />
  )
}
