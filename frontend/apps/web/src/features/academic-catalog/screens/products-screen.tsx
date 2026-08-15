"use client"
import Link from "next/link"
import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import { Dropdown } from "@/shared/components/forms/dropdown"
import { CatalogPage } from "../components/catalog-page"
import { CatalogPermissionBoundary } from "../components/catalog-permission-boundary"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
import { productColumns } from "../config/product-table"
import { useCatalogLookups, useCategories, useProductMutations, useProducts, useProductTypes } from "../hooks/use-academic-catalog"
import { defaultProductQuery } from "../utils/product-list-query"
export function ProductsScreen() {
  const canUpdate = useMockPermission("catalog.products.update"), canArchive = useMockPermission("catalog.products.archive")
  const [query, setQuery] = useState(defaultProductQuery)
  const products = useProducts(query)
  const types = useProductTypes(), categories = useCategories(), lookups = useCatalogLookups(), lifecycle = useProductMutations().transition
  return (
    <CatalogPage
      permission="catalog.products.view"
      title="المنتجات الأكاديمية"
      description="المصدر الموحد لكل البرامج والدبلومات والدورات."
      actions={
        <CatalogPermissionBoundary permission="catalog.products.create"><Button nativeButton={false} render={<Link href="/academic-catalog/products/create" />}>
          <Plus />
          إضافة منتج
        </Button></CatalogPermissionBoundary>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="min-w-48 space-y-1 text-sm">
          <span>الحالة</span>
          <Dropdown
            value={query.statuses?.[0] ?? ""}
            placeholder="كل الحالات"
            options={[
              { value: "draft", label: "مسودة" },
              { value: "active", label: "نشط" },
              { value: "hidden", label: "مخفي" },
              { value: "closed", label: "مغلق" },
              { value: "archived", label: "مؤرشف" },
            ]}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                statuses: event.target.value
                  ? [
                      event.target.value as
                        "draft" | "active" | "hidden" | "closed" | "archived",
                    ]
                  : [],
                page: 1,
              }))
            }
          />
        </label>
        <label className="min-w-48 space-y-1 text-sm"><span>نوع المنتج</span><Dropdown value={query.typeIds?.[0] ?? ""} placeholder="كل الأنواع" options={(types.data?.items ?? []).map((item) => ({ value: item.id, label: item.nameAr }))} onChange={(event) => setQuery((current) => ({ ...current, typeIds: event.target.value ? [event.target.value] : [], page: 1 }))} /></label>
        <label className="min-w-48 space-y-1 text-sm"><span>التصنيف</span><Dropdown value={query.categoryIds?.[0] ?? ""} placeholder="كل التصنيفات" options={(categories.data?.items ?? []).map((item) => ({ value: item.id, label: item.nameAr }))} onChange={(event) => setQuery((current) => ({ ...current, categoryIds: event.target.value ? [event.target.value] : [], page: 1 }))} /></label>
        <label className="min-w-48 space-y-1 text-sm"><span>القسم</span><Dropdown value={query.departmentIds?.[0] ?? ""} placeholder="كل الأقسام" options={lookups.data?.departments ?? []} onChange={(event) => setQuery((current) => ({ ...current, departmentIds: event.target.value ? [event.target.value] : [], page: 1 }))} /></label>
        <label className="min-w-48 space-y-1 text-sm"><span>الفرع</span><Dropdown value={query.branchIds?.[0] ?? ""} placeholder="كل الفروع" options={lookups.data?.branches ?? []} onChange={(event) => setQuery((current) => ({ ...current, branchIds: event.target.value ? [event.target.value] : [], page: 1 }))} /></label>
        <label className="min-w-48 space-y-1 text-sm">
          <span>الترتيب</span>
          <Dropdown
            value={query.sort}
            options={[
              { value: "updatedAt", label: "آخر تحديث" },
              { value: "name", label: "الاسم" },
              { value: "code", label: "الرمز" },
              { value: "price", label: "السعر" },
            ]}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                sort: event.target.value as
                  "updatedAt" | "name" | "code" | "price",
                page: 1,
              }))
            }
          />
        </label>
      </div>
      <Card>
        <DataTable
          data={products.data?.items ?? []}
          columns={canUpdate ? productColumns : productColumns.filter((column) => column.id !== "actions")}
          loading={products.isLoading}
          error={products.error?.message}
          onRetry={() => void products.refetch()}
          getRowId={(row) => row.id}
          onBulkAction={canArchive ? (rows) => { void Promise.all(rows.filter((row) => row.status !== "archived").map((row) => lifecycle.mutateAsync({ id: row.id, toStatus: "archived", reason: "أرشفة جماعية", expectedVersion: row.version }))) } : undefined}
          controlled={{
            search: query.search ?? "",
            page: products.data?.page ?? query.page,
            pageSize: query.pageSize,
            total: products.data?.total ?? 0,
            totalPages: products.data?.totalPages ?? 1,
            onSearchChange: (search) =>
              setQuery((current) => ({ ...current, search, page: 1 })),
            onPageChange: (page) =>
              setQuery((current) => ({ ...current, page })),
          }}
        />
      </Card>
    </CatalogPage>
  )
}
