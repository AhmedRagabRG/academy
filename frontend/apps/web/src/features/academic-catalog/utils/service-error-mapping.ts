import { AcademicCatalogError } from "../services/academic-catalog-error"
export const getCatalogErrorMessage = (error: unknown) =>
  error instanceof AcademicCatalogError
    ? error.message
    : "تعذر تحميل بيانات المسارات الأكاديمية"
