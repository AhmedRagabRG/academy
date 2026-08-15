"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import { usePermission } from "@/shared/hooks/use-permission"
import type { ExpenseCategoryId } from "../types/common"
import type { SubCategoryListQuery } from "../types/commands"
import type { ExpenseSubCategorySummary } from "../types/projections"
import { categoryCopy } from "../config/accounting-copy"
import { accountingPermissions } from "../config/accounting-permissions"
import {
  useCategories,
  useCreateSubCategory,
  useSetSubCategoryStatus,
  useSubCategories,
  useUpdateSubCategory,
} from "../hooks/use-categories"
import { subCategoryColumns } from "../components/category-columns"
import { CategoryDialog } from "../forms/category-form"
import {
  AccountingAreaState,
  AccountingEmptyState,
} from "../components/accounting-area-states"

const defaultQuery: SubCategoryListQuery = { page: 1, pageSize: 20 }

export function ExpenseSubCategoriesScreen() {
  const [query, setQuery] = useState<SubCategoryListQuery>(defaultQuery)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ExpenseSubCategorySummary | undefined>(
    undefined
  )

  const subCategories = useSubCategories(query)
  // Only active parents may be chosen for a new sub-category.
  const parents = useCategories({ page: 1, pageSize: 100, activeOnly: true })
  const create = useCreateSubCategory()
  const update = useUpdateSubCategory()
  const setStatus = useSetSubCategoryStatus()
  const canManage = usePermission(accountingPermissions.categoriesManage)

  const parentOptions = useMemo(
    () =>
      (parents.data?.items ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [parents.data]
  )

  const columns = useMemo(
    () =>
      subCategoryColumns({
        canManage,
        onEdit: setEditing,
        onToggleStatus: (row) =>
          setStatus.mutate({
            subCategoryId: row.id,
            status: row.status === "active" ? "archived" : "active",
            expectedVersion: row.version,
          }),
      }),
    [canManage, setStatus]
  )

  const rows = subCategories.data?.items ?? []
  const filtered = Boolean(query.search) || Boolean(query.categoryIds?.length)
  const showEmpty = !subCategories.isLoading && !subCategories.error && rows.length === 0

  return (
    <PageContainer>
      <PageHeader
        title={categoryCopy.subTitle}
        description={categoryCopy.archivedNotice}
        actions={
          canManage && (
            <Button onClick={() => setCreating(true)} disabled={parentOptions.length === 0}>
              <Plus aria-hidden />
              {categoryCopy.createSub}
            </Button>
          )
        }
      />

      <AccountingAreaState
        permission={accountingPermissions.categoriesView}
        loading={subCategories.isLoading}
        error={subCategories.error}
        onRetry={() => void subCategories.refetch()}
        loadingLabel="جارٍ تحميل التصنيفات الفرعية"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label htmlFor="sub-category-parent" className="text-sm font-medium">
                {categoryCopy.parent}
              </label>
              <select
                id="sub-category-parent"
                value={query.categoryIds?.[0] ?? ""}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    categoryIds: event.target.value
                      ? [event.target.value as ExpenseCategoryId]
                      : undefined,
                    page: 1,
                  }))
                }
                className="border-input bg-background focus-visible:ring-ring h-10 rounded-lg border px-3 outline-none focus-visible:ring-2"
              >
                <option value="">الكل</option>
                {parentOptions.map((parent) => (
                  <option key={parent.value} value={parent.value}>
                    {parent.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Card>
            {showEmpty ? (
              <AccountingEmptyState
                filtered={filtered}
                emptyTitle={categoryCopy.emptyAllTitle}
                filteredTitle={categoryCopy.emptyTitle}
                onClearFilters={() => setQuery(defaultQuery)}
              />
            ) : (
              <DataTable
                data={rows}
                columns={columns}
                getRowId={(row) => row.id}
                controlled={{
                  search: query.search ?? "",
                  page: subCategories.data?.page ?? query.page,
                  pageSize: query.pageSize,
                  total: subCategories.data?.total ?? 0,
                  totalPages: subCategories.data?.totalPages ?? 1,
                  onSearchChange: (search) =>
                    setQuery((current) => ({ ...current, search, page: 1 })),
                  onPageChange: (page) => setQuery((current) => ({ ...current, page })),
                }}
              />
            )}
          </Card>
        </div>
      </AccountingAreaState>

      {creating && (
        <CategoryDialog
          title={categoryCopy.createSub}
          parents={parentOptions}
          pending={create.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) =>
            create.mutate(
              {
                categoryId: values.categoryId as ExpenseCategoryId,
                input: { name: values.name, description: values.description },
              },
              { onSuccess: () => setCreating(false) }
            )
          }
        />
      )}

      {editing && (
        <CategoryDialog
          title={`${categoryCopy.subTitle} — ${editing.name}`}
          parents={parentOptions}
          initial={{
            name: editing.name,
            description: editing.description,
            categoryId: editing.categoryId,
          }}
          pending={update.isPending}
          onClose={() => setEditing(undefined)}
          onSubmit={(values) =>
            update.mutate(
              {
                subCategoryId: editing.id,
                input: { name: values.name, description: values.description },
                expectedVersion: editing.version,
              },
              { onSuccess: () => setEditing(undefined) }
            )
          }
        />
      )}
    </PageContainer>
  )
}
