"use client"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { formatMoney } from "@/shared/utils/money"
import { CatalogPage } from "../components/catalog-page"
import { CatalogQueryState } from "../components/catalog-query-state"
import { ActivationReadinessSummary } from "../components/activation-readiness-summary"
import { BidiValue } from "../components/bidi-value"
import { ProductLifecycleActions } from "../components/product-lifecycle-actions"
import { CatalogPermissionBoundary } from "../components/catalog-permission-boundary"
import { useProduct, useReadiness } from "../hooks/use-academic-catalog"
const status = {
  draft: "مسودة",
  active: "نشط",
  hidden: "مخفي",
  closed: "مغلق",
  archived: "مؤرشف",
}
export function ProductDetailScreen({ productId }: { productId: string }) {
  const product = useProduct(productId),
    readiness = useReadiness(productId)
  return (
    <CatalogPage
      permission="catalog.products.view"
      title="تفاصيل المنتج"
      description="السجل الأكاديمي والتجاري المعتمد للمنتج."
      actions={
        <div className="flex flex-wrap gap-2">
          {product.data?.typeName === "برنامج مهني" && (
            <CatalogPermissionBoundary permission="batches.view">
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={`/academic-catalog/programs/${productId}/batches`}
                  />
                }
              >
                دفعات البرنامج
              </Button>
            </CatalogPermissionBoundary>
          )}
          <CatalogPermissionBoundary permission="catalog.products.update">
            <Button
              nativeButton={false}
              render={
                <Link href={`/academic-catalog/products/${productId}/edit`} />
              }
            >
              تعديل المنتج
            </Button>
          </CatalogPermissionBoundary>
        </div>
      }
    >
      <CatalogQueryState
        loading={product.isLoading || readiness.isLoading}
        error={product.error ?? readiness.error}
      >
        {product.data && readiness.data && (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <StatusBadge
                      label={status[product.data.status]}
                      tone={
                        product.data.status === "active"
                          ? "success"
                          : product.data.status === "archived"
                            ? "danger"
                            : "warning"
                      }
                    />
                    <BidiValue>{product.data.code}</BidiValue>
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-brand-navy dark:text-foreground">
                    {product.data.officialName}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {product.data.typeName} · {product.data.categoryName}
                  </p>
                </div>
                <ProductLifecycleActions product={product.data} />
              </div>
            </Card>
            <ActivationReadinessSummary readiness={readiness.data} />
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <h3 className="font-bold">السعر المرجعي</h3>
                <p className="mt-2 text-2xl font-bold text-brand-navy dark:text-foreground">
                  <BidiValue>
                    {formatMoney(product.data.pricing.basePrice)}
                  </BidiValue>
                </p>
              </Card>
              <Card>
                <h3 className="font-bold">الفروع</h3>
                <p className="mt-2 text-2xl font-bold">
                  {
                    new Set(product.data.branches.map((item) => item.branchId))
                      .size
                  }
                </p>
              </Card>
              <Card>
                <h3 className="font-bold">آخر تحديث</h3>
                <p className="mt-2">
                  <BidiValue>
                    {new Date(product.data.updatedAt).toLocaleDateString(
                      "ar-EG"
                    )}
                  </BidiValue>
                </p>
              </Card>
            </div>
            <Card>
              <h2 className="font-heading text-lg font-bold">الوصف</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                {product.data.description}
              </p>
            </Card>
          </div>
        )}
      </CatalogQueryState>
    </CatalogPage>
  )
}
