import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

export function Badge({ className, ...props }: React.ComponentProps<"span">) { return <span className={cn("bg-muted text-muted-foreground inline-flex rounded-full px-2.5 py-1 text-xs font-medium", className)} {...props} /> }
