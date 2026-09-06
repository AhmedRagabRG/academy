export function Section({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-lg font-medium">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
