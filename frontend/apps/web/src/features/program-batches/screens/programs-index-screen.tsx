"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import { EmptyState } from "@/shared/components/states/empty-state"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { useProducts } from "@/features/academic-catalog/hooks/use-academic-catalog"
import type { ProductSummary } from "@/features/academic-catalog/types/domain"

/**
 * The entry point to batches, which are always scoped to one program.
 *
 * There is no such thing as "all batches" — every batch belongs to a program,
 * and the batches routes are keyed by that program's id. So the navigation
 * entry lands here, on the programs that actually take batches, rather than on
 * a single program chosen in advance.
 */
export function ProgramsIndexScreen() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const query = useProducts({
    search,
    page,
    pageSize: 10,
    // Only an active product can be enrolled into, so only an active one is
    // worth opening batches for.
    statuses: ["active"],
    sort: "name",
    direction: "asc",
  })

  // Batching follows the product's type, which the list already reports.
  const programs = useMemo(
    () => (query.data?.items ?? []).filter((product) => product.batchable),
    [query.data]
  )

  const columns = useMemo<ColumnDef<ProductSummary>[]>(
    () => [
      {
        accessorKey: "nameAr",
        header: "البرنامج",
        cell: ({ row }) => (
          <Link
            className="text-brand-blue font-medium hover:underline"
            href={`/academic-catalog/programs/${row.original.id}/batches`}
          >
            {row.original.nameAr}
          </Link>
        ),
      },
      {
        accessorKey: "code",
        header: "الرمز",
        cell: ({ row }) => <bdi dir="ltr">{row.original.code}</bdi>,
      },
      { accessorKey: "typeName", header: "النوع" },
      { accessorKey: "categoryName", header: "التصنيف" },
      {
        id: "status",
        header: "الحالة",
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.status === "active" ? "نشط" : "غير نشط"}
            tone={row.original.status === "active" ? "success" : "warning"}
          />
        ),
      },
    ],
    []
  )

  return (
    <PageContainer>
      <PageHeader
        title="دفعات البرامج"
        description="اختر برنامجًا لإدارة جداوله وسعته وأسعاره ودورة حياة كل دفعة."
      />
      <Card>
        {!query.isLoading && !query.error && programs.length === 0 ? (
          <EmptyState
            title="لا توجد برامج قابلة للدفعات"
            description="الدفعات متاحة للبرامج المهنية النشطة فقط. فعّل برنامجًا من كتالوج المنتجات ليظهر هنا."
          />
        ) : (
          <DataTable
            data={programs}
            columns={columns}
            loading={query.isLoading}
            error={query.error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
            getRowId={(product) => product.id}
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
        )}
      </Card>
    </PageContainer>
  )
}
