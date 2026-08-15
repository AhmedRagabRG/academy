"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { FormProvider, useForm, type FieldPath, type Resolver } from "react-hook-form"
import { FormWrapper } from "@/shared/components/forms/form-wrapper"
import { ProductSection } from "../components/product-section"
import {
  productSchema,
  type ProductFormValues,
} from "../schemas/product-schema"
import type { Category, ProductDetail, ProductType } from "../types/domain"
import type { CatalogLookups } from "../types/configuration"
import { ProductBasicInformationSection } from "./product-basic-information-section"
import { ProductAcademicSection } from "./product-academic-section"
import { ProductPricingSection } from "./product-pricing-section"
import { ProductAvailabilitySection } from "./product-availability-section"
import { ProductSalesSection } from "./product-sales-section"
import { useUnsavedProductGuard } from "../hooks/use-unsaved-product-guard"
import { Dropdown } from "@/shared/components/forms/dropdown"
import { AcademicCatalogError } from "../services/academic-catalog-error"
import { CatalogPermissionBoundary } from "../components/catalog-permission-boundary"
import { zeroCatalogMoney } from "../utils/catalog-money"

export const emptyProductValues: ProductFormValues = {
  officialName: "",
  nameAr: "",
  nameEn: "",
  code: "",
  productTypeId: "",
  categoryId: "",
  departmentId: "",
  description: "",
  academic: {},
  pricing: {
    basePrice: zeroCatalogMoney(),
    registrationFees: zeroCatalogMoney(),
    certificateFees: zeroCatalogMoney(),
    trainingFees: zeroCatalogMoney(),
    cardFees: zeroCatalogMoney(),
    examFees: zeroCatalogMoney(),
    additionalFees: zeroCatalogMoney(),
    discount: zeroCatalogMoney(),
    scholarship: zeroCatalogMoney(),
    installmentAvailable: false,
    installmentMinCount: 1,
    installmentMaxCount: 12,
    installmentFrequency: "monthly",
  },
  branches: [],
  content: {
    salesScript: "",
    faqs: [{ id: "faq-1", title: "", description: "", position: 0 }],
    admissionRequirements: [{ id: "requirement-1", title: "", position: 0 }],
    requiredDocuments: [
      { id: "document-1", title: "", position: 0, required: true },
    ],
  },
}
export function valuesFromProduct(product: ProductDetail): ProductFormValues {
  return {
    officialName: product.officialName,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    code: product.code,
    productTypeId: product.productTypeId,
    categoryId: product.categoryId,
    departmentId: product.departmentId ?? "",
    description: product.description,
    academic: product.academic,
    pricing: product.pricing,
    branches: product.branches,
    content: product.content,
  }
}
function PermissionNotice() { return <div role="note" className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">هذا القسم غير متاح وفق صلاحياتك الحالية.</div> }
const sections = [
  ["basic", "المعلومات الأساسية"],
  ["academic", "المعلومات الأكاديمية"],
  ["pricing", "المعلومات المالية"],
  ["availability", "توفر الفروع"],
  ["sales", "معلومات المبيعات"],
] as const
export function ProductEditorForm({
  values,
  types,
  categories,
  lookups,
  pending,
  onSubmit,
}: {
  values: ProductFormValues
  types: ProductType[]
  categories: Category[]
  lookups: CatalogLookups
  pending: boolean
  onSubmit: (values: ProductFormValues) => Promise<void> | void
}) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: values,
  })
  useUnsavedProductGuard(form.formState.isDirty)
  const submit = async (submitted: ProductFormValues) => { try { await onSubmit(submitted) } catch (error) { if (error instanceof AcademicCatalogError && error.fieldErrors) { const entries = Object.entries(error.fieldErrors); for (const [field, message] of entries) form.setError(field as FieldPath<ProductFormValues>, { message }); if (entries[0]) form.setFocus(entries[0][0] as FieldPath<ProductFormValues>) } } }
  return (
    <FormProvider {...form}>
      <FormWrapper form={form} onSubmit={submit} pending={pending}>
        <div className="grid items-start gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="أقسام المنتج"
            className="sticky top-24 hidden rounded-xl border bg-card p-3 xl:block"
          >
            <ul className="space-y-1">
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-6">
            <label className="block space-y-2 xl:hidden">
              <span className="text-sm font-medium">أقسام المنتج</span>
              <Dropdown
                aria-label="أقسام المنتج"
                value=""
                placeholder="انتقل إلى قسم"
                options={sections.map(([id, label]) => ({ value: id, label }))}
                onChange={(event) =>
                  document
                    .getElementById(event.target.value)
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              />
            </label>
            <ProductSection id="basic" title="المعلومات الأساسية">
              <ProductBasicInformationSection
                types={types}
                categories={categories}
                lookups={lookups}
              />
            </ProductSection>
            <CatalogPermissionBoundary permission="catalog.academic.manage" fallback={<PermissionNotice />}><ProductSection id="academic" title="المعلومات الأكاديمية"><ProductAcademicSection types={types} lookups={lookups} /></ProductSection></CatalogPermissionBoundary>
            <CatalogPermissionBoundary permission="catalog.pricing.manage" fallback={<PermissionNotice />}><ProductSection id="pricing" title="المعلومات المالية"><ProductPricingSection /></ProductSection></CatalogPermissionBoundary>
            <CatalogPermissionBoundary permission="catalog.availability.manage" fallback={<PermissionNotice />}><ProductSection id="availability" title="توفر الفروع"><ProductAvailabilitySection lookups={lookups} /></ProductSection></CatalogPermissionBoundary>
            <CatalogPermissionBoundary permission="catalog.content.manage" fallback={<PermissionNotice />}><ProductSection id="sales" title="معلومات المبيعات"><ProductSalesSection /></ProductSection></CatalogPermissionBoundary>
            <div className="sticky bottom-4 z-10 flex justify-end rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "جارٍ الحفظ..." : "حفظ المنتج"}
              </Button>
            </div>
          </div>
        </div>
      </FormWrapper>
    </FormProvider>
  )
}
