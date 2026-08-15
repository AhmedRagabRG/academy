import { FlaskConical } from "lucide-react"

/**
 * Marks a module that is not backed by the API.
 *
 * Several modules still run on in-memory fixtures because the backend serves
 * no routes for them yet. Their state lives in a module-level array, so a
 * record created here disappears on the next page load — which reads as data
 * loss rather than as a module that was never connected. Saying so on the page
 * is the difference between a known gap and a bug report.
 *
 * Delete the notice from a module's layout when its endpoints land.
 */
export function FixtureDataNotice() {
  return (
    <div
      data-testid="fixture-data-notice"
      className="border-brand-gold/50 bg-brand-gold/10 text-muted-foreground flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="text-foreground font-medium">بيانات تجريبية.</span>{" "}
        هذه الوحدة غير مرتبطة بالخادم بعد، وأي سجل تنشئه هنا لن يُحفظ ولن يظهر بعد
        تحديث الصفحة.
      </p>
    </div>
  )
}
