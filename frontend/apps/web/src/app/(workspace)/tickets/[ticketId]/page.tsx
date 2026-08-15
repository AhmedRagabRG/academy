import { TicketDetailScreen, type TicketId } from "@/features/tickets"
export const metadata = { title: "مساحة التذكرة" }
export default async function TicketPage({ params }: { params: Promise<{ ticketId: string }> }) { const { ticketId } = await params; return <TicketDetailScreen ticketId={ticketId as TicketId} /> }
