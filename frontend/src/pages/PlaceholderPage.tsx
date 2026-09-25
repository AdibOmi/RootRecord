import { ConstructionIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { t } from '@/i18n'

/** Stand-in for sections built in later phases. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={ConstructionIcon}
          title={t.placeholder.title}
          description={t.placeholder.body}
          action={
            <Button variant="outline" asChild>
              <Link to="/">{t.placeholder.backToDashboard}</Link>
            </Button>
          }
        />
      </Card>
    </>
  )
}
