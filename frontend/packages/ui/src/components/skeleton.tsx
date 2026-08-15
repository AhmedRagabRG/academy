import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) { return <div aria-hidden className={cn("bg-muted animate-pulse rounded-lg", className)} {...props} /> }
