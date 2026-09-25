import { ChevronDownIcon, KeyRoundIcon, LogOutIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { useLogout, useUser } from '@/features/auth/hooks'
import { t } from '@/i18n'
import { initials } from '@/lib/utils'

export function UserMenu() {
  const user = useUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const [changingPassword, setChangingPassword] = useState(false)

  const signOut = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success(t.auth.signedOut)
        navigate('/login', { replace: true })
      },
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg p-1.5 pr-2 transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initials(user.full_name)}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium">{user.full_name}</span>
            <span className="block text-xs text-muted-foreground">{t.roles[user.role]}</span>
          </span>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <div className="text-sm font-medium">{user.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setChangingPassword(true)}>
            <KeyRoundIcon />
            {t.auth.changePassword}
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={signOut}>
            <LogOutIcon />
            {t.auth.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
    </>
  )
}
