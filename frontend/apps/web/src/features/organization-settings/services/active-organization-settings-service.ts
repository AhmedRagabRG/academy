import { httpOrganizationSettingsService } from "./http-organization-settings-service"
import { mockOrganizationSettingsService } from "./mock-organization-settings-service"
import type { OrganizationSettingsService } from "./organization-settings-service"
import { useMockServices } from "@/shared/config/service-mode"

/** The implementation the screens run against — the API unless mocks are on. */
export const organizationSettingsService: OrganizationSettingsService =
  useMockServices ? mockOrganizationSettingsService : httpOrganizationSettingsService
