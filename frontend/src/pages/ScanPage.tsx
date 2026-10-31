import {
  AlertCircleIcon,
  CameraIcon,
  ImageIcon,
  Loader2Icon,
  PlusIcon,
  ScanTextIcon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { errorMessage } from '@/api/client'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useScanPrescription } from '@/features/prescriptions/hooks'
import { t } from '@/i18n'
import { preparePhoto } from '@/lib/image'

/** Matches prescription_service.MAX_PAGES on the backend. */
const MAX_PAGES = 6

interface PickedPage {
  id: number
  file: File
  preview: string
}

export function ScanPage() {
  const navigate = useNavigate()
  const scan = useScanPrescription()
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const nextId = useRef(0)
  const [pages, setPages] = useState<PickedPage[]>([])
  const [preparing, setPreparing] = useState(false)

  // Revoke preview URLs when pages are removed or the page unmounts.
  const previews = useRef<string[]>([])
  previews.current = pages.map((p) => p.preview)
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    scan.reset()
    const added = Array.from(files)
      .slice(0, MAX_PAGES - pages.length)
      .map((file) => ({ id: nextId.current++, file, preview: URL.createObjectURL(file) }))
    setPages((prev) => [...prev, ...added])
  }

  const removePage = (id: number) => {
    setPages((prev) => {
      const page = prev.find((p) => p.id === id)
      if (page) URL.revokeObjectURL(page.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const read = async () => {
    setPreparing(true)
    try {
      const photos = await Promise.all(pages.map((p) => preparePhoto(p.file)))
      scan.mutate(photos, {
        onSuccess: (draft) => navigate(`/prescriptions/${draft.id}`, { replace: true }),
      })
    } finally {
      setPreparing(false)
    }
  }

  const busy = preparing || scan.isPending
  const full = pages.length >= MAX_PAGES

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.scan.title} description={t.scan.description} />

      <Card className="overflow-hidden">
        {pages.length > 0 && (
          <div className="relative bg-muted p-3">
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {pages.map((page, i) => (
                <li key={page.id} className="overflow-hidden rounded-lg border bg-card">
                  <div className="relative">
                    <img
                      src={page.preview}
                      alt={`${t.scan.page} ${i + 1}`}
                      className="aspect-[3/4] w-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-background/90 px-1.5 text-xs font-medium">
                      {t.scan.page} {i + 1}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-full rounded-none border-t text-destructive hover:text-destructive"
                    aria-label={`${t.scan.discardPage} ${i + 1}`}
                    disabled={busy}
                    onClick={() => removePage(page.id)}
                  >
                    <Trash2Icon />
                    {t.scan.discard}
                  </Button>
                </li>
              ))}
              {!full && (
                <li>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => cameraInput.current?.click()}
                    className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-card/60 p-3 text-center transition-colors hover:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
                      <PlusIcon className="size-6" />
                    </span>
                    <span className="text-sm font-medium text-primary">{t.scan.addPage}</span>
                    <span className="text-xs text-muted-foreground">{t.scan.addPageHint}</span>
                  </button>
                </li>
              )}
            </ol>
            {busy && (
              <div
                className="absolute inset-0 grid place-items-center bg-background/75 backdrop-blur-[2px]"
                role="status"
                aria-live="polite"
              >
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <Loader2Icon className="size-8 animate-spin text-primary" />
                  <p className="font-medium">{t.scan.uploading}</p>
                  <p className="text-sm text-muted-foreground">{t.scan.uploadingHint}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <CardContent className="space-y-5 p-5 sm:p-6">
          {scan.isError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">{t.scan.failed}</p>
                <p>{errorMessage(scan.error)}</p>
              </div>
            </div>
          )}

          {pages.length > 0 && (
            <div className="space-y-2">
              <Button size="lg" className="h-14 w-full text-base" disabled={busy} onClick={() => void read()}>
                <ScanTextIcon className="size-5" />
                {t.scan.read}
                {pages.length > 1 && ` (${pages.length} ${t.scan.pages})`}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {full ? t.scan.maxPages : t.scan.morePagesHint}
              </p>
            </div>
          )}

          {pages.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="lg" className="h-14 text-base" onClick={() => cameraInput.current?.click()}>
                <CameraIcon className="size-5" />
                {t.scan.takePhoto}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 text-base"
                onClick={() => galleryInput.current?.click()}
              >
                <ImageIcon className="size-5" />
                {t.scan.choosePhoto}
              </Button>
            </div>
          ) : (
            // The + tile above takes the next photo; the gallery stays one tap away.
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full"
              disabled={busy || full}
              onClick={() => galleryInput.current?.click()}
            >
              <ImageIcon className="size-5" />
              {t.scan.addPageGallery}
            </Button>
          )}

          {/* `capture` opens the rear camera directly on phones; desktops show a file picker. */}
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <input
            ref={galleryInput}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />

          <div className="rounded-lg bg-muted/60 p-4 text-sm">
            <p className="mb-2 font-medium">{t.scan.tipsTitle}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>{t.scan.tipLight}</li>
              <li>{t.scan.tipFrame}</li>
              <li>{t.scan.tipSteady}</li>
              <li>{t.scan.tipPages}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
