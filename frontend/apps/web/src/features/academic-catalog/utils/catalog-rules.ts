import type { AcademicProduct, ProductType } from "../types/domain"
import type {
  ActivationReadiness,
  EnrollmentEligibility,
  ProductStatus,
} from "../types/common"
import type { CatalogLookups } from "../types/configuration"

export const normalizeProductCode = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, "-")
export const allowedTransitions: Record<ProductStatus, ProductStatus[]> = {
  draft: ["active", "archived"],
  active: ["hidden", "closed", "archived"],
  hidden: ["active", "closed", "archived"],
  closed: ["active", "archived"],
  archived: [],
}
export function getActivationReadiness(
  product: AcademicProduct,
  type: ProductType | undefined,
  lookups: CatalogLookups
): ActivationReadiness {
  const issues: ActivationReadiness["issues"] = []
  if (!product.officialName.trim())
    issues.push({
      section: "basic",
      field: "officialName",
      message: "الاسم الرسمي مطلوب",
    })
  if (!product.code.trim())
    issues.push({
      section: "basic",
      field: "code",
      message: "رمز المنتج مطلوب",
    })
  if (!type || type.status !== "active")
    issues.push({
      section: "basic",
      field: "productTypeId",
      message: "نوع المنتج غير متاح",
    })
  for (const field of type?.fields.filter((item) => item.required) ?? [])
    if (
      product.academic[field.key] === undefined ||
      product.academic[field.key] === ""
    )
      issues.push({
        section: "academic",
        field: `academic.${field.key}`,
        message: `${field.label} مطلوب`,
      })
  if (
    !product.branches.some(
      (item) =>
        item.role === "registration" &&
        lookups.branches.some(
          (branch) =>
            branch.value === item.branchId &&
            branch.status !== "inactive" &&
            branch.status !== "archived"
        )
    )
  )
    issues.push({
      section: "availability",
      field: "registrationBranches",
      message: "يلزم فرع تسجيل نشط واحد على الأقل",
    })
  if (
    !product.branches.some(
      (item) =>
        item.role === "study" &&
        lookups.branches.some(
          (branch) =>
            branch.value === item.branchId &&
            branch.status !== "inactive" &&
            branch.status !== "archived"
        )
    )
  )
    issues.push({
      section: "availability",
      field: "studyBranches",
      message: "يلزم فرع دراسة نشط واحد على الأقل",
    })
  return { ready: issues.length === 0, issues, version: product.version }
}
export function getEligibility(
  product: AcademicProduct,
  branchId: string,
  lookups: CatalogLookups
): EnrollmentEligibility {
  if (product.status !== "active")
    return { eligible: false, reason: "product-not-active" }
  const branch = lookups.branches.find((item) => item.value === branchId)
  if (!branch || branch.status !== "active")
    return { eligible: false, reason: "branch-inactive" }
  return product.branches.some(
    (item) => item.branchId === branchId && item.role === "registration"
  )
    ? { eligible: true, reason: "eligible" }
    : { eligible: false, reason: "registration-not-assigned" }
}
