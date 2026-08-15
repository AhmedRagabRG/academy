import { httpProgramBatchService } from "./http-program-batch-service"
import { mockProgramBatchService } from "./mock-program-batch-service"
import type { ProgramBatchService } from "./program-batch-service"
import { useMockServices } from "@/shared/config/service-mode"

/** The implementation the screens run against — the API unless mocks are on. */
export const programBatchService: ProgramBatchService = useMockServices
  ? mockProgramBatchService
  : httpProgramBatchService
