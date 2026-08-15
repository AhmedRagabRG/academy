"use client"

import { ChevronDown } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@workspace/ui/lib/utils"

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
}

export function Dropdown({ options, placeholder, error, className, ...props }: Omit<ComponentProps<"select">, "children"> & { options: readonly DropdownOption[]; placeholder?: string; error?: boolean }) {
  return <span className="relative block"><select {...props} aria-invalid={error || undefined} className={cn("border-input bg-background focus-visible:border-ring focus-visible:ring-ring/30 h-11 w-full appearance-none rounded-lg border ps-3 pe-10 text-sm outline-none transition-[border-color,box-shadow] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50", error && "border-destructive", className)}>{placeholder && <option value="" disabled>{placeholder}</option>}{options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select><ChevronDown className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" aria-hidden /></span>
}
