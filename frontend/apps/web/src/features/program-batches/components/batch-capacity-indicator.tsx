import type { BatchCapacity } from "../types/domain"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
const labels = {
  available: "متاحة",
  "nearly-full": "قاربت على الامتلاء",
  full: "مكتملة",
  "over-capacity": "تجاوزت السعة",
}
export function BatchCapacityIndicator({
  capacity,
}: {
  capacity: BatchCapacity
}) {
  return (
    <div className="flex min-w-36 flex-col items-start gap-1.5">
      <StatusBadge
        label={labels[capacity.state]}
        tone={
          capacity.state === "available"
            ? "success"
            : capacity.state === "nearly-full"
              ? "warning"
              : "danger"
        }
      />
      <p className="text-xs whitespace-nowrap text-muted-foreground">
        <bdi dir="ltr">{capacity.availableSeats}</bdi> مقعدًا متاحًا من{" "}
        <bdi dir="ltr">{capacity.maximumStudents}</bdi>
      </p>
      <span className="sr-only" dir="ltr">
        {capacity.availableSeats} / {capacity.maximumStudents}
      </span>
    </div>
  )
}
