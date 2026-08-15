export function ProductSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-28 rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="mb-5">
        <h2
          id={`${id}-title`}
          className="font-heading text-xl font-bold text-brand-navy dark:text-foreground"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}
