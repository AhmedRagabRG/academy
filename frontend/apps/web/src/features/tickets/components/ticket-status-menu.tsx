"use client"
import { activeStatuses, ticketConfiguration } from "../config/ticket-configuration"
import type { TicketStatus } from "../types/common"
export function TicketStatusMenu({ current, disabled, onMove }: { current: TicketStatus; disabled?: boolean; onMove: (status: Exclude<TicketStatus, "archived">) => void }) {
  return <label className="text-xs"><span className="sr-only">نقل إلى حالة</span><select aria-label="نقل التذكرة إلى حالة" disabled={disabled} value={current === "archived" ? "backlog" : current} onChange={(e) => onMove(e.target.value as Exclude<TicketStatus, "archived">)} className="border-border bg-background rounded-md border px-2 py-1">
    {activeStatuses.map((id) => <option key={id} value={id}>{ticketConfiguration.statuses.find((s) => s.id === id)?.name}</option>)}
  </select></label>
}
