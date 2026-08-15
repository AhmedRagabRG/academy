"use client"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
import { ErrorState } from "@/shared/components/states/error-state"
import { CatalogPage } from "../components/catalog-page"
import { CatalogQueryState } from "../components/catalog-query-state"
import {
  ProductEditorForm,
  valuesFromProduct,
} from "../forms/product-editor-form"
import {
  useCatalogLookups,
  useCategories,
  useProduct,
  useProductMutations,
  useProductTypes,
} from "../hooks/use-academic-catalog"
export function EditProductScreen({ productId }: { productId: string }) {
  const allowed = useMockPermission("catalog.products.update")
  const product = useProduct(productId),
    lookups = useCatalogLookups(),
    types = useProductTypes(),
    categories = useCategories(),
    update = useProductMutations().update
  if (!allowed) return <CatalogPage title="تعديل المنتج" description="تحديث بيانات المنتج."><ErrorState message="لا تملك صلاحية تعديل المنتجات." /></CatalogPage>
  return (
    <CatalogPage
      title="تعديل المنتج"
      description="حدّث أقسام المنتج مع الحفاظ على سياقه التشغيلي."
    >
      <CatalogQueryState
        loading={
          product.isLoading ||
          lookups.isLoading ||
          types.isLoading ||
          categories.isLoading
        }
        error={
          product.error ?? lookups.error ?? types.error ?? categories.error
        }
      >
        {product.data && lookups.data && types.data && categories.data && (
          <ProductEditorForm
            key={product.data.version}
            values={valuesFromProduct(product.data)}
            types={types.data.items}
            categories={categories.data.items}
            lookups={lookups.data}
            pending={update.isPending}
            onSubmit={async (values) => {
              await update.mutateAsync({
                ...values,
                id: product.data.id,
                expectedVersion: product.data.version,
              })
            }}
          />
        )}
      </CatalogQueryState>
    </CatalogPage>
  )
}
