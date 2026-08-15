import { cn } from "@workspace/ui/lib/utils"
export function Card({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cn("border-border bg-card brand-shadow rounded-lg border p-6", className)}>{children}</div> }
