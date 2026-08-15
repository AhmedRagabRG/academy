import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

export function Card({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("border-border bg-card rounded-lg border p-6 shadow-sm", className)} {...props} /> }
