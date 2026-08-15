"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { usePathname } from "next/navigation"
import { foundationNavigation } from "@/shared/config/foundation-navigation"
import { findActiveItem } from "@/shared/utils/navigation"

export function Breadcrumbs() {
  const pathname = usePathname()
  const active = findActiveItem(foundationNavigation, pathname)
  return <nav aria-label="مسار الصفحة" className="text-muted-foreground hidden items-center gap-1 text-sm sm:flex"><Link href="/dashboard">الرئيسية</Link>{active?.route !== "/dashboard" && <><ChevronLeft className="size-4" aria-hidden /><span aria-current="page">{active?.title ?? "صفحة"}</span></>}</nav>
}
