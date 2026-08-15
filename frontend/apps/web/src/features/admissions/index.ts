export { admissionsNavigation } from "./config/navigation"
export { AdmissionsScreen } from "./screens/admissions-screen"
export { CreateAdmissionScreen } from "./screens/create-admission-screen"
export { EditAdmissionScreen } from "./screens/edit-admission-screen"
export { AdmissionDetailScreen } from "./screens/admission-detail-screen"
export { admissionsService } from "./services/mock-admissions-service"
export { admissionScenarios } from "./services/mock-scenario-controller"
export type { AdmissionsService } from "./services/admissions-service"
export type {
  AdmissionDetail,
  AdmissionSummary,
  EnrollmentReadinessSummary,
  AdmissionApprovalSnapshot,
} from "./types/domain"
export type { AdmissionId, ApplicantId } from "./types/common"

/**
 * Enrolling an approved admission is served by Student Management's intake
 * port, registered here at the composition root. See the registry for why it
 * cannot be a status transition.
 */
export {
  registerAdmissionEnrollmentHandler,
  resetAdmissionEnrollmentHandler,
} from "./services/admission-enrollment-registry"
export type { AdmissionEnrollmentHandler } from "./services/admission-enrollment-registry"
