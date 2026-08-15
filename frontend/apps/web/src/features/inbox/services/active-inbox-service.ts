import { mockInboxService } from "./mock-inbox-service"
import { httpInboxService } from "./http-inbox-service"
import type { InboxService } from "./inbox-service"
import { useMockServices } from "@/shared/config/service-mode"

export const inboxService: InboxService = useMockServices
  ? mockInboxService
  : httpInboxService
