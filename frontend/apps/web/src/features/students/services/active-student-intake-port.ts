import { httpStudentIntakePort } from "./http-student-intake-port"
import { studentIntakePort as mockStudentIntakePort } from "./student-intake-port"
import type { StudentIntakePort } from "./student-intake-port"
import { useMockServices } from "@/shared/config/service-mode"

/** The intake boundary Admissions calls — the API unless mocks are on. */
export const studentIntakePort: StudentIntakePort = useMockServices
  ? mockStudentIntakePort
  : httpStudentIntakePort
