import { httpAdmissionsService } from "./http-admissions-service"
import { admissionsService as mockAdmissionsService } from "./mock-admissions-service"
import type { AdmissionsService } from "./admissions-service"
import { useMockServices } from "@/shared/config/service-mode"

/** The implementation the screens run against — the API unless mocks are on. */
export const admissionsService: AdmissionsService = useMockServices
  ? mockAdmissionsService
  : httpAdmissionsService
