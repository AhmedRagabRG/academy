import { httpStudentsService } from "./http-students-service"
import { studentsService as mockStudentsService } from "./mock-students-service"
import type { StudentsService } from "./students-service"
import { useMockServices } from "@/shared/config/service-mode"

/** The implementation the screens run against — the API unless mocks are on. */
export const studentsService: StudentsService = useMockServices
  ? mockStudentsService
  : httpStudentsService
