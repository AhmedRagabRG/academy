"use client"

import { Menu, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { foundationNavigation } from "@/shared/config/foundation-navigation"
import { filterNavigation } from "@/shared/utils/navigation"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import { SidebarNavigation } from "./sidebar-navigation"

export function TabletNavigation() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const context = useEmployeeContextStore((state) => state.context)
  const items = filterNavigation(foundationNavigation, new Set(context?.role.permissionKeys ?? []))
  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLElement>("button")?.focus()
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); return }
      if (event.key !== "Tab" || !panelRef.current) return
      const controls = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')]
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [open])
  return <>
    <button ref={buttonRef} type="button" onClick={() => setOpen(true)} className="focus-visible:ring-ring grid size-10 place-items-center rounded-lg lg:hidden" aria-label="فتح التنقل" aria-expanded={open}><Menu /></button>
    {open && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="التنقل"><button className="absolute inset-0 bg-black/50" aria-label="إغلاق التنقل" onClick={() => { setOpen(false); buttonRef.current?.focus() }} /><aside ref={panelRef} className="bg-card absolute inset-y-0 end-0 w-72 border-s p-4 shadow-xl"><div className="mb-5 flex items-center justify-between"><strong>التنقل</strong><button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus() }} aria-label="إغلاق التنقل"><X /></button></div><SidebarNavigation items={items} onNavigate={() => setOpen(false)} /></aside></div>}
  </>
}
