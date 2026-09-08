"use client"
import { Archive, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { TicketDetail } from "../types/projections"
export function TicketGovernanceActions({
  ticket,
  pending,
  onArchive,
  onRestore,
  onDelete,
}: {
  ticket: TicketDetail
  pending?: boolean
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ticket.status !== "archived" && ticket.capabilities.archive && (
        <Button variant="outline" disabled={pending} onClick={onArchive}>
          <Archive />
          أرشفة
        </Button>
      )}
      {ticket.status === "archived" && ticket.capabilities.restore && (
        <Button variant="outline" disabled={pending} onClick={onRestore}>
          <RotateCcw />
          استعادة
        </Button>
      )}
      {ticket.capabilities.delete && (
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                "حذف التذكرة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
              )
            )
              onDelete()
          }}
        >
          <Trash2 />
          حذف
        </Button>
      )}
    </div>
  )
}
