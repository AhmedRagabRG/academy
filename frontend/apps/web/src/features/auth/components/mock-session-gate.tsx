"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { LoadingState } from "@/shared/components/states/loading-state"
import { useSession } from "../hooks/use-session"

export function MockSessionGate({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => { if (session.isSuccess && !session.data) router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`) }, [pathname, router, session.data, session.isSuccess])
  if (session.isPending || !session.data) return <LoadingState label="جارٍ تجهيز مساحة العمل" />
  return children
}
