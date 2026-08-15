import { activityFixtures, attachmentFixtures, commentFixtures, ticketFixtures } from "../data/ticket-fixtures"
import type { Ticket, TicketActivity, TicketAttachment, TicketComment } from "../types/domain"

interface State { tickets: Ticket[]; comments: TicketComment[]; activity: TicketActivity[]; attachments: TicketAttachment[] }
const key = "alsalam.ticket-management.v1"
const seed = (): State => structuredClone({ tickets: ticketFixtures, comments: commentFixtures, activity: activityFixtures, attachments: attachmentFixtures })
let memory: State | undefined

function load(): State {
  if (memory) return memory
  if (typeof sessionStorage !== "undefined") {
    try { const raw = sessionStorage.getItem(key); if (raw) return (memory = JSON.parse(raw) as State) } catch { /* reseed */ }
  }
  return (memory = seed())
}
function save(state: State) {
  memory = state
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, JSON.stringify(state))
}

export const ticketRepository = {
  read: () => structuredClone(load()),
  mutate<T>(operation: (draft: State) => T): T {
    const draft = structuredClone(load())
    const result = operation(draft)
    save(draft)
    return structuredClone(result)
  },
  reset() { memory = seed(); if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key) },
}
