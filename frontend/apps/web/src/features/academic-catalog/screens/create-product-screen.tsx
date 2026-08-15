"use client"
import { useRouter } from "next/navigation"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
import { ErrorState } from "@/shared/components/states/error-state"
import { CatalogPage } from "../components/catalog-page"
import { CatalogQueryState } from "../components/catalog-query-state"
import {
  ProductEditorForm,
  emptyProductValues,
} from "../forms/product-editor-form"
import {
  useCatalogLookups,
  useCategories,
  useProductMutations,
  useProductTypes,
} from "../hooks/use-academic-catalog"
export function CreateProductScreen() {
  const router = useRouter()
  const allowed = useMockPermission("catalog.products.create")
  const lookups = useCatalogLookups(),
    types = useProductTypes(),
    categories = useCategories(),
    create = useProductMutations().create
  if (!allowed) return <CatalogPage title="إضافة منتج أكاديمي" description="إنشاء سجل منتج جديد."><ErrorState message="لا تملك صلاحية إنشاء المنتجات." /></CatalogPage>
  return (
    <CatalogPage
      title="إضافة منتج أكاديمي"
      description="أنشئ مسودة موحدة ثم أكمل متطلبات التفعيل."
    >
      <CatalogQueryState
        loading={lookups.isLoading || types.isLoading || categories.isLoading}
        error={lookups.error ?? types.error ?? categories.error}
      >
        {lookups.data && types.data && categories.data && (
          <ProductEditorForm
            values={emptyProductValues}
            types={types.data.items}
            categories={categories.data.items}
            lookups={lookups.data}
            pending={create.isPending}
            onSubmit={async (values) => {
              const product = await create.mutateAsync(values)
              router.replace(`/academic-catalog/products/${product.id}`)
            }}
          />
        )}
      </CatalogQueryState>
    </CatalogPage>
  )
}
