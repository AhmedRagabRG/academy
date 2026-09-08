import { useMockServices } from "@/shared/config/service-mode"
import { httpPipelineAdminService } from "./http-pipeline-admin-service"
import { mockPipelineAdminService } from "./mock-pipeline-admin-service"
import type { PipelineAdminService } from "./pipeline-admin-service"

export const pipelineAdminService: PipelineAdminService = useMockServices
  ? mockPipelineAdminService
  : httpPipelineAdminService
