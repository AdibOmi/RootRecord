import { DownloadIcon, Share2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { errorMessage } from '@/api/client'
import { prescriptionsApi } from '@/api/prescriptions'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'

interface Props {
  id: string
  patientName: string
  /** YYYY-MM-DD */
  visitDate: string | null
  size?: 'sm' | 'default'
}

/** Matches pdf_service.filename on the backend. */
function fileName(patientName: string, visitDate: string | null): string {
  const name = patientName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'patient'
  return `prescription-${name}-${visitDate ?? 'prescription'}.pdf`
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// The share sheet (WhatsApp, Messenger, email…) only exists on HTTPS pages.
const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'

/** Download a filed prescription as a PDF, or share it straight to the patient from a phone. */
export function SharePrescription({ id, patientName, visitDate, size = 'default' }: Props) {
  const [busy, setBusy] = useState<'share' | 'download' | null>(null)

  const run = async (mode: 'share' | 'download') => {
    setBusy(mode)
    try {
      const blob = await prescriptionsApi.pdf(id)
      const file = new File([blob], fileName(patientName, visitDate), { type: 'application/pdf' })
      if (mode === 'share' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${t.share.title} – ${patientName}` })
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          // E.g. the browser refused because the PDF took too long to prepare.
          download(file)
        }
      } else {
        download(file)
      }
    } catch (err) {
      toast.error(`${t.share.failed}: ${errorMessage(err)}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      {canShareFiles && (
        <Button type="button" size={size} disabled={busy !== null} onClick={() => void run('share')}>
          <Share2Icon />
          {busy === 'share' ? t.share.preparing : t.share.share}
        </Button>
      )}
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={busy !== null}
        onClick={() => void run('download')}
      >
        <DownloadIcon />
        {busy === 'download' ? t.share.preparing : t.share.download}
      </Button>
    </>
  )
}
