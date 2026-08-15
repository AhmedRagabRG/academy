import { Inbox } from "lucide-react"

export function EmptyState({ title = "لا توجد بيانات", description, action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return (
    <section className="border-border bg-card flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center">
      <Inbox className="text-muted-foreground size-8" aria-hidden />
      <h2 className="font-medium">{title}</h2>
      {description && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action}
    </section>
  )
}
