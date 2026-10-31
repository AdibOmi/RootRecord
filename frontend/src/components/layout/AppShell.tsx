import { CameraIcon, MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useUser } from '@/features/auth/hooks'
import { t } from '@/i18n'
import { can } from '@/lib/permissions'

import { GlobalSearch } from './GlobalSearch'
import { Logo } from './Logo'
import { Sidebar, SidebarNav } from './Sidebar'
import { UserMenu } from './UserMenu'

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const user = useUser()

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-full">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:px-6">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label={t.nav.openMenu}>
                  <MenuIcon className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent aria-describedby={undefined}>
                <SheetTitle className="sr-only">{t.nav.mainMenu}</SheetTitle>
                <div className="flex h-16 items-center px-5">
                  <Logo />
                </div>
                <div className="py-4">
                  <SidebarNav onNavigate={() => setDrawerOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex flex-1 justify-start">
              <GlobalSearch />
            </div>
            {can(user, 'clinical:edit') && (
              <Button asChild size="icon" className="sm:w-auto sm:px-4">
                <Link to="/scan" aria-label={t.nav.scan}>
                  <CameraIcon className="size-[18px]" />
                  <span className="hidden sm:inline">{t.nav.scan}</span>
                </Link>
              </Button>
            )}
            <UserMenu />
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
