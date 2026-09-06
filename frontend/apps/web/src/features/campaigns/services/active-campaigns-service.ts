import { useMockServices } from "@/shared/config/service-mode"
import { httpCampaignsService } from "./http-campaigns-service"
import { mockCampaignsService } from "./mock-campaigns-service"
import type { CampaignsService } from "./campaigns-service"

export const campaignsService: CampaignsService = useMockServices
  ? mockCampaignsService
  : httpCampaignsService
