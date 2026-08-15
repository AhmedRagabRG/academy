export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><span className="mb-3 block h-0.5 w-8 bg-brand-gold" aria-hidden /><h1 className="font-heading truncate text-2xl font-bold text-brand-navy dark:text-foreground">{title}</h1>{description && <p className="text-muted-foreground mt-2 max-w-[65ch]">{description}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
