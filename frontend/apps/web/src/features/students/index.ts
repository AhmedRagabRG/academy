export { studentsNavigation } from "./config/navigation"
export {
  studentsPermissions,
  allStudentsPermissions,
  studentAreaPermission,
} from "./config/students-permissions"
export type {
  StudentsPermission,
  StudentArea,
} from "./config/students-permissions"

export { StudentsScreen } from "./screens/students-screen"
export { StudentWorkspaceLayout } from "./screens/student-workspace-layout"
export { StudentOverviewScreen } from "./screens/student-overview-screen"
export { EditStudentScreen } from "./screens/edit-student-screen"
export { StudentDocumentsScreen } from "./screens/student-documents-screen"
export { StudentNotesScreen } from "./screens/student-notes-screen"
export { StudentTimelineScreen } from "./screens/student-timeline-screen"

export { studentsService } from "./services/active-students-service"

/**
 * The fixture-backed implementation, published for sibling modules that are
 * themselves still on fixtures.
 *
 * Student Finance's invoices reference fixture student ids (`student-STD-…`),
 * which exist in no database. Resolving them through the live service returns
 * "not found" for every one, so a module must read students from the same side
 * of the mock/API line it lives on. Delete this export once every consumer is
 * linked to the API.
 */
export { studentsService as fixtureStudentsService } from "./services/mock-students-service"
export { studentIntakePort } from "./services/active-student-intake-port"
export { studentScenarios } from "./services/mock-scenario-controller"

export type { StudentsService } from "./services/students-service"
export type { StudentIntakePort } from "./services/student-intake-port"
export type {
  StudentsError,
  StudentsErrorCode,
} from "./services/students-error"

export type {
  StudentSummary,
  StudentDetail,
  StudentContextSummary,
  StudentRef,
} from "./types/projections"
export type { StudentId, StudentStatus, OfferingKind } from "./types/common"

/**
 * The finance-reader registration point. Student Finance registers its adapter
 * here at the composition root; Students never imports Student Finance, so the
 * dependency stays one-way.
 */
export {
  registerStudentFinanceReader,
  resetStudentFinanceReader,
} from "./services/student-finance-registry"
export type { StudentFinanceReader } from "./services/students-dependency-readers"
export type {
  StudentFinancialSummary,
  StudentFinancialSummaryResult,
  FinanceUnavailableReason,
} from "./types/domain"

/**
 * Exposed so Student Finance can invalidate the financial-summary entry after a
 * balance changes, and so a test can pin the two sides against each other rather
 * than trusting a duplicated literal.
 */
export { studentKeys } from "./services/students-query-keys"
