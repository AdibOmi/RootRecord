import { SearchIcon, UserSearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useUser } from '@/features/auth/hooks'
import { t } from '@/i18n'

import { visibleNavItems } from './nav'

/** Top-bar search trigger plus the Ctrl+K / ⌘K command palette. */
export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const user = useUser()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-lg border bg-muted/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      >
        <SearchIcon className="size-4" />
        <span className="flex-1 truncate text-left">{t.search.trigger}</span>
        <kbd className="hidden rounded border bg-card px-1.5 py-0.5 font-sans text-[11px] font-medium sm:inline">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t.search.title}
        description={t.search.description}
      >
        <CommandInput placeholder={t.search.placeholder} />
        <CommandList>
          <CommandEmpty>{t.search.noResults}</CommandEmpty>
          <CommandGroup heading={t.nav.patients}>
            <CommandItem disabled value="patients-coming-soon">
              <UserSearchIcon />
              <span className="text-muted-foreground">{t.search.patientsComingSoon}</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading={t.search.goTo}>
            {visibleNavItems(user).map(({ to, label, icon: Icon }) => (
              <CommandItem key={to} value={`go ${label}`} onSelect={() => go(to)}>
                <Icon />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
