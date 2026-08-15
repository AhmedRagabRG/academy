import { Badge } from "@workspace/ui/components/badge"
import { ticketConfiguration } from "../config/ticket-configuration"
import type { TicketPriority } from "../types/common"
export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) { const item = ticketConfiguration.priorities.find((p) => p.id === priority); return <Badge className={item?.tone}>{item?.name ?? priority}</Badge> }
