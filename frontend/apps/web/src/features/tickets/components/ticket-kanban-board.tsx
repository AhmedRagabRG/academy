"use client"
import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { GripVertical } from "lucide-react"
import { activeStatuses, ticketConfiguration } from "../config/ticket-configuration"
import type { TicketSummary } from "../types/projections"
import type { TicketStatus } from "../types/common"
import { TicketCard } from "./ticket-card"

function DraggableCard({ ticket, onMove }: { ticket: TicketSummary; onMove: (status: Exclude<TicketStatus, "archived">) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id, disabled: !ticket.capabilities.changeStatus, data: { ticket } })
  return <div ref={setNodeRef} className={isDragging ? "opacity-50" : ""}><button type="button" className="text-muted-foreground mb-1 flex w-full cursor-grab items-center justify-center rounded focus-visible:ring-2" aria-label={`اسحب ${ticket.number} لتغيير الحالة`} {...listeners} {...attributes}><GripVertical className="size-4" /></button><TicketCard ticket={ticket} onMove={onMove} /></div>
}
function Column({ status, tickets, onMove }: { status: Exclude<TicketStatus, "archived">; tickets: TicketSummary[]; onMove: (ticket: TicketSummary, status: Exclude<TicketStatus, "archived">) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return <section ref={setNodeRef} aria-labelledby={`column-${status}`} className={`bg-muted/40 flex h-full min-h-0 w-[19rem] shrink-0 flex-col overflow-hidden rounded-xl p-3 ${isOver ? "ring-primary ring-2" : ""}`}><header className="bg-muted/80 z-10 mb-3 flex shrink-0 items-center justify-between rounded-lg px-2 py-2"><h2 id={`column-${status}`} className="font-semibold">{ticketConfiguration.statuses.find((s) => s.id === status)?.name}</h2><span className="bg-background rounded-full px-2 py-0.5 text-xs">{tickets.length}</span></header><div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pe-1">{tickets.map((ticket) => <DraggableCard key={ticket.id} ticket={ticket} onMove={(next) => onMove(ticket, next)} />)}{tickets.length === 0 && <p className="text-muted-foreground py-12 text-center text-sm">لا توجد تذاكر</p>}</div></section>
}
export function TicketKanbanBoard({ tickets, onMove }: { tickets: TicketSummary[]; onMove: (ticket: TicketSummary, status: Exclude<TicketStatus, "archived">) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const end = (event: DragEndEvent) => { const ticket = event.active.data.current?.ticket as TicketSummary | undefined; const status = event.over?.id as Exclude<TicketStatus, "archived"> | undefined; if (ticket && status && ticket.status !== status) onMove(ticket, status) }
  return <DndContext sensors={sensors} onDragEnd={end} accessibility={{ screenReaderInstructions: { draggable: "اضغط مفتاح المسافة لالتقاط التذكرة، واستخدم الأسهم للتحريك، ثم اضغط المسافة للإفلات أو Escape للإلغاء." } }}><div className="flex h-[calc(100svh-31rem)] min-h-96 max-h-[34rem] snap-x gap-4 overflow-x-auto overflow-y-hidden pb-2" aria-label="لوحة سير عمل التذاكر">{activeStatuses.map((status) => <Column key={status} status={status} tickets={tickets.filter((ticket) => ticket.status === status)} onMove={onMove} />)}</div></DndContext>
}
