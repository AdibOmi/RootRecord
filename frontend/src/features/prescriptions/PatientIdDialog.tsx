import { CameraIcon, PencilLineIcon } from 'lucide-react'

import type { PatientRef } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { t } from '@/i18n'
import { formatPatientCode } from '@/lib/format'

interface Props {
  patient: PatientRef | null
  isNew: boolean
  onScanNext: () => void
  onClose: () => void
}

/** Shown right after filing: the ID the assistant writes on the paper prescription. */
export function PatientIdDialog({ patient, isNew, onScanNext, onClose }: Props) {
  return (
    <Dialog open={patient !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilLineIcon className="size-5 text-primary" />
            {t.review.idDialogTitle}
          </DialogTitle>
          <DialogDescription>{t.review.idDialogBody}</DialogDescription>
        </DialogHeader>
        {patient && (
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 text-center">
            <p className="font-mono text-4xl font-bold tracking-widest sm:text-5xl">
              {formatPatientCode(patient.patient_code)}
            </p>
            <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="font-medium">{patient.full_name}</span>
              <Badge variant={isNew ? 'accent' : 'muted'}>
                {isNew ? t.review.idDialogNew : t.review.idDialogReturning}
              </Badge>
            </p>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            {t.review.done}
          </Button>
          <Button size="lg" onClick={onScanNext}>
            <CameraIcon />
            {t.review.scanNext}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
