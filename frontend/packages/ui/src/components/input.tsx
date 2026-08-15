import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2 disabled:opacity-50", className)} {...props} />
}
