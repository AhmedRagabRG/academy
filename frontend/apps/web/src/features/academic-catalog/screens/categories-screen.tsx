"use client"
import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import { Dropdown } from "@/shared/components/forms/dropdown"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { CatalogPage } from "../components/catalog-page"
import { CategoryForm } from "../forms/category-form"
import {
  useCategories,
  useCategoryMutations,
} from "../hooks/use-academic-catalog"
import type { Category } from "../types/domain"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
export function CategoriesScreen() {
  const canCreate = useMockPermission("catalog.categories.create")
  const canUpdate = useMockPermission("catalog.categories.update")
  const canActivate = useMockPermission("catalog.categories.activate")
  const canArchive = useMockPermission("catalog.categories.archive")
  const [editing, setEditing] = useState(false),
    [selected, setSelected] = useState<Category>(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState<"all" | "active" | "inactive" | "archived">(
      "all"
    ),
    [page, setPage] = useState(1)
  const query = useCategories({ search, status, page, pageSize: 10 }),
    mutations = useCategoryMutations()
  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      { accessorKey: "nameAr", header: "التصنيف" },
      { accessorKey: "nameEn", header: "الاسم الإنجليزي" },
      {
        accessorKey: "status",
        header: "الحالة",
        cell: ({ row }) => (
          <StatusBadge
            label={
              row.original.status === "active"
                ? "نشط"
                : row.original.status === "inactive"
                  ? "غير نشط"
                  : "مؤرشف"
            }
            tone={row.original.status === "active" ? "success" : "neutral"}
          />
        ),
      },
      {
        id: "actions",
        header: "إجراءات",
        cell: ({ row }) => (
          <div className="flex gap-1">
            {canUpdate && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelected(row.original)
                  setEditing(true)
                }}
              >
                تعديل
              </Button>
            )}
            {((row.original.status === "active" && canArchive) ||
              (row.original.status !== "active" && canActivate)) && (
              <Button
                variant="ghost"
                onClick={() =>
                  mutations.status.mutate({
                    id: row.original.id,
                    status:
                      row.original.status === "active" ? "archived" : "active",
                    expectedVersion: row.original.version,
                  })
                }
              >
                {row.original.status === "active" ? "أرشفة" : "تفعيل"}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [mutations.status, canActivate, canArchive, canUpdate]
  )
  return (
    <CatalogPage
      permission="catalog.categories.view"
      title="تصنيفات المنتجات"
      description="نظّم المنتجات في تصنيفات قابلة للتوسع."
      actions={
        canCreate ? (
          <Button
            onClick={() => {
              setSelected(undefined)
              setEditing(true)
            }}
          >
            <Plus />
            إضافة تصنيف
          </Button>
        ) : undefined
      }
    >
      <div
        className={
          editing ? "grid gap-6 xl:grid-cols-[1fr_400px]" : "grid gap-6"
        }
      >
        <Card>
          <div className="mb-4 max-w-56">
            <label className="space-y-1 text-sm">
              <span>الحالة</span>
              <Dropdown
                value={status}
                options={[
                  { value: "all", label: "كل الحالات" },
                  { value: "active", label: "نشط" },
                  { value: "inactive", label: "غير نشط" },
                  { value: "archived", label: "مؤرشف" },
                ]}
                onChange={(event) => {
                  setStatus(event.target.value as typeof status)
                  setPage(1)
                }}
              />
            </label>
          </div>
          <DataTable
            data={query.data?.items ?? []}
            columns={columns}
            loading={query.isLoading}
            error={query.error?.message}
            onRetry={() => void query.refetch()}
            getRowId={(row) => row.id}
            controlled={{
              search,
              page: query.data?.page ?? page,
              pageSize: 10,
              total: query.data?.total ?? 0,
              totalPages: query.data?.totalPages ?? 1,
              onSearchChange: (value) => {
                setSearch(value)
                setPage(1)
              },
              onPageChange: setPage,
            }}
          />
        </Card>
        {editing && (
          <Card>
            <h2 className="mb-4 font-heading text-lg font-bold">
              {selected ? "تعديل التصنيف" : "تصنيف جديد"}
            </h2>
            <CategoryForm
              key={selected?.id ?? "new"}
              values={
                selected
                  ? {
                      nameAr: selected.nameAr,
                      nameEn: selected.nameEn,
                      description: selected.description,
                    }
                  : undefined
              }
              pending={mutations.create.isPending || mutations.update.isPending}
              onSubmit={(values) =>
                selected
                  ? mutations.update.mutate(
                      {
                        id: selected.id,
                        input: { ...values, expectedVersion: selected.version },
                      },
                      { onSuccess: () => setEditing(false) }
                    )
                  : mutations.create.mutate(values, {
                      onSuccess: () => setEditing(false),
                    })
              }
            />
          </Card>
        )}
      </div>
    </CatalogPage>
  )
}
