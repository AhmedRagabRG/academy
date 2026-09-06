import { useMockServices } from "@/shared/config/service-mode"
import { httpChannelsService } from "./http-channels-service"
import { mockChannelsService } from "./mock-channels-service"
import type { ChannelsService } from "./channels-service"

export const channelsService: ChannelsService = useMockServices
  ? mockChannelsService
  : httpChannelsService
