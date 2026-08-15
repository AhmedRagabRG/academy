"use client"

import { LogOut, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSignOut } from "@/features/auth"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"

export function UserMenu() {
  const context = useEmployeeContextStore((state) => state.context)
  const signOut = useSignOut()
  const router = useRouter()
  return <div className="flex items-center gap-3"><span className="bg-muted grid size-9 place-items-center rounded-full"><UserRound className="size-4" /></span><div className="hidden text-sm sm:block"><p className="font-medium">{context?.employee.displayName}</p><p className="text-muted-foreground text-xs">{context?.role.displayName}</p></div><button type="button" onClick={async () => { await signOut.mutateAsync(); router.replace("/login") }} className="focus-visible:ring-ring grid size-9 place-items-center rounded-lg focus-visible:ring-2" aria-label="تسجيل الخروج"><LogOut className="size-4" /></button></div>
}
