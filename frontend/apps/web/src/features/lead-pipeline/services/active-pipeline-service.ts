import { useMockServices } from "@/shared/config/service-mode"
import { httpPipelineService } from "./http-pipeline-service"
import { mockPipelineService } from "./mock-pipeline-service"
import type { PipelineService } from "./pipeline-service"

export const pipelineService: PipelineService = useMockServices
  ? mockPipelineService
  : httpPipelineService
