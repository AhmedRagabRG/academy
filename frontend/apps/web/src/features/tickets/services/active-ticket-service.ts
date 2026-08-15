import { useMockServices } from "@/shared/config/service-mode"
import { httpTicketService } from "./http-ticket-service"
import { mockTicketService } from "./mock-ticket-service"

export const ticketService = useMockServices
  ? mockTicketService
  : httpTicketService
