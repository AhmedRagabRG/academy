"use client"

import { Laptop, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

const options = [{ value: "light", label: "فاتح", Icon: Sun }, { value: "dark", label: "داكن", Icon: Moon }, { value: "system", label: "النظام", Icon: Laptop }] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false)
  if (!mounted) return <span className="bg-muted block size-9 rounded-lg" aria-hidden />
  return (
    <div className="border-border flex rounded-lg border p-1" aria-label="المظهر">
      {options.map(({ value, label, Icon }) => <button key={value} type="button" title={label} aria-label={label} aria-pressed={theme === value} onClick={() => setTheme(value)} className="aria-pressed:bg-accent focus-visible:ring-ring grid size-8 place-items-center rounded-md focus-visible:ring-2"><Icon className="size-4" aria-hidden /></button>)}
    </div>
  )
}
