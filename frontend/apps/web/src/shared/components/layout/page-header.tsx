export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><span className="mb-2 block h-0.5 w-8 bg-brand-gold" aria-hidden /><h1 className="font-heading truncate text-lg font-medium text-brand-navy dark:text-foreground">{title}</h1>{description && <p className="text-muted-foreground mt-1.5 text-xs max-w-[65ch]">{description}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
