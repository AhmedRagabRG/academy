import { Clock3 } from "lucide-react"
import type { AdmissionLifecycleEvent } from "../types/domain"
import { admissionStatusLabels } from "../config/admissions-copy"

export function AdmissionLifecycleTimeline({
  events,
}: {
  events: AdmissionLifecycleEvent[]
}) {
  return (
    <section aria-labelledby="lifecycle-title">
      <h2 id="lifecycle-title" className="font-heading text-lg font-bold">
        سجل الحالة
      </h2>
      <ol className="mt-4 space-y-3">
        {[...events].reverse().map((event) => (
          <li key={event.id} className="flex gap-3 rounded-lg border p-3">
            <Clock3 className="mt-0.5 size-4 text-brand-blue" aria-hidden />
            <div>
              <p className="font-medium">
                {admissionStatusLabels[event.toStatus]}
              </p>
              <p className="text-xs text-muted-foreground">
                <bdi dir="ltr">
                  {new Date(event.occurredAt).toLocaleString("ar-EG")}
                </bdi>{" "}
                · {event.actor.name}
              </p>
              {event.reason && <p className="mt-1 text-sm">{event.reason}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
