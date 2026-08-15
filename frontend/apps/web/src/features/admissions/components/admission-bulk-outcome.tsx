export function AdmissionBulkOutcome({
  success,
  failed,
}: {
  success: number
  failed: number
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border bg-muted/40 p-3 text-sm"
    >
      تم تنفيذ {success} سجل، وتعذر تنفيذ {failed} سجل.
    </div>
  )
}
