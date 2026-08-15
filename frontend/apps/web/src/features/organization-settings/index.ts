export { SettingsOverviewScreen } from "./screens/settings-overview-screen"
export { GeneralSettingsScreen } from "./screens/general-settings-screen"
export { BranchesScreen } from "./screens/branches-screen"
export { DepartmentsScreen } from "./screens/departments-screen"
export { AcademicYearsScreen } from "./screens/academic-years-screen"
export { AcademicYearDetailScreen } from "./screens/academic-year-detail-screen"
export { AcademicTermsScreen } from "./screens/academic-terms-screen"
export { UsersScreen } from "./screens/users-screen"
export { UserProfileScreen } from "./screens/user-profile-screen"
export { RolesScreen } from "./screens/roles-screen"
export { RoleDetailScreen } from "./screens/role-detail-screen"
export { PermissionsScreen } from "./screens/permissions-screen"
export { DocumentRequirementsScreen } from "./screens/document-requirements-screen"
export { mockOrganizationSettingsService } from "./services/mock-organization-settings-service"
/**
 * The live service, for sibling modules that need the organization's own
 * identity — a printed invoice carries the letterhead, and the logo, address
 * and contacts on it are this module's data, not Finance's.
 */
export { organizationSettingsService } from "./services/active-organization-settings-service"
export type {
  AdmissionOrganizationConfiguration,
  AdmissionOrganizationReference,
} from "./types/admissions-consumer"
