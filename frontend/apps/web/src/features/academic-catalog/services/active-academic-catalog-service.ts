import { academicCatalogService as mockAcademicCatalogService } from "./mock-academic-catalog-service"
import type { AcademicCatalogService } from "./academic-catalog-service"
import { httpAcademicCatalogService } from "./http-academic-catalog-service"
import { useMockServices } from "@/shared/config/service-mode"

/** The implementation the screens run against — the API unless mocks are on. */
export const academicCatalogService: AcademicCatalogService = useMockServices
  ? mockAcademicCatalogService
  : httpAcademicCatalogService
