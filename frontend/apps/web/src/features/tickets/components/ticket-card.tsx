"use client"
import Link from "next/link"
import { CalendarClock, MessageSquare, UserRound } from "lucide-react"
import { Card } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import type { TicketSummary } from "../types/projections"
import { TicketPriorityBadge } from "./ticket-priority-badge"
import { TicketStatusMenu } from "./ticket-status-menu"
export function TicketCard({ ticket, onMove }: { ticket: TicketSummary; onMove: (status: Exclude<TicketSummary["status"], "archived">) => void }) {
  return <Card className="space-y-3 p-4 shadow-sm transition hover:shadow-md" data-ticket-id={ticket.id}>
    <div className="flex items-start justify-between gap-2"><bdi dir="ltr" className="text-muted-foreground text-xs font-medium">{ticket.number}</bdi><TicketPriorityBadge priority={ticket.priority} /></div>
    <Link href={`/tickets/${ticket.id}`} className="block font-medium leading-6 hover:text-primary">{ticket.title}</Link>
    {ticket.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{ticket.tags.map((tag) => <Badge key={tag} className="bg-primary/5">{tag}</Badge>)}</div>}
    <div className="text-muted-foreground space-y-1 text-xs">{ticket.teamName && <p>الفريق: {ticket.teamName}</p>}{ticket.employeeName && <p className="flex items-center gap-1"><UserRound className="size-3" />{ticket.employeeName}</p>}{ticket.customerName && <p>العميل: {ticket.customerName}</p>}{ticket.studentName && <p>الطالب: {ticket.studentName}</p>}</div>
    <div className="border-border flex items-center justify-between border-t pt-2"><span className="text-muted-foreground flex items-center gap-1 text-xs"><MessageSquare className="size-3" />{ticket.commentCount}</span>{ticket.dueAt && <span className="text-muted-foreground flex items-center gap-1 text-xs"><CalendarClock className="size-3" /><bdi dir="ltr">{new Intl.DateTimeFormat("ar-EG", { month: "short", day: "numeric" }).format(new Date(ticket.dueAt))}</bdi></span>}<TicketStatusMenu current={ticket.status} disabled={!ticket.capabilities.changeStatus} onMove={onMove} /></div>
  </Card>
}
