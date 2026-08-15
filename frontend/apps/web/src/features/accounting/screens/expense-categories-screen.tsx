"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import { usePermission } from "@/shared/hooks/use-permission"
import type { CategoryListQuery } from "../types/commands"
import type { ExpenseCategorySummary } from "../types/projections"
import { categoryCopy } from "../config/accounting-copy"
import { accountingPermissions } from "../config/accounting-permissions"
import {
  useCategories,
  useCreateCategory,
  useSetCategoryStatus,
  useUpdateCategory,
} from "../hooks/use-categories"
import { categoryColumns } from "../components/category-columns"
import { CategoryDialog } from "../forms/category-form"
import {
  AccountingAreaState,
  AccountingEmptyState,
} from "../components/accounting-area-states"

const defaultQuery: CategoryListQuery = { page: 1, pageSize: 20 }

export function ExpenseCategoriesScreen() {
  const [query, setQuery] = useState<CategoryListQuery>(defaultQuery)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategorySummary | undefined>(undefined)

  const categories = useCategories(query)
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const setStatus = useSetCategoryStatus()
  const canManage = usePermission(accountingPermissions.categoriesManage)

  const columns = useMemo(
    () =>
      categoryColumns({
        canManage,
        onEdit: setEditing,
        onToggleStatus: (row) =>
          setStatus.mutate({
            categoryId: row.id,
            status: row.status === "active" ? "archived" : "active",
            expectedVersion: row.version,
          }),
      }),
    [canManage, setStatus]
  )

  const rows = categories.data?.items ?? []
  const filtered = Boolean(query.search) || Boolean(query.statuses?.length)
  const showEmpty = !categories.isLoading && !categories.error && rows.length === 0

  return (
    <PageContainer>
      <PageHeader
        title={categoryCopy.title}
        description={categoryCopy.archivedNotice}
        actions={
          canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              {categoryCopy.create}
            </Button>
          )
        }
      />

      <AccountingAreaState
        permission={accountingPermissions.categoriesView}
        loading={categories.isLoading}
        error={categories.error}
        onRetry={() => void categories.refetch()}
        loadingLabel="جارٍ تحميل التصنيفات"
      >
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
                page: categories.data?.page ?? query.page,
                pageSize: query.pageSize,
                total: categories.data?.total ?? 0,
                totalPages: categories.data?.totalPages ?? 1,
                onSearchChange: (search) =>
                  setQuery((current) => ({ ...current, search, page: 1 })),
                onPageChange: (page) => setQuery((current) => ({ ...current, page })),
              }}
            />
          )}
        </Card>
      </AccountingAreaState>

      {creating && (
        <CategoryDialog
          title={categoryCopy.create}
          pending={create.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) =>
            create.mutate(
              { input: { name: values.name, description: values.description } },
              { onSuccess: () => setCreating(false) }
            )
          }
        />
      )}

      {editing && (
        <CategoryDialog
          title={`${categoryCopy.title} — ${editing.name}`}
          initial={{ name: editing.name, description: editing.description }}
          pending={update.isPending}
          onClose={() => setEditing(undefined)}
          onSubmit={(values) =>
            update.mutate(
              {
                categoryId: editing.id,
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
