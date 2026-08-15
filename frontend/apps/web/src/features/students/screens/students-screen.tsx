"use client"

import { useMemo, useState } from "react"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { StudentListQuery } from "../types/commands"
import type { BulkStatusOutcome } from "../types/projections"
import {
  clearFilters,
  defaultStudentListQuery,
  hasActiveFilters,
} from "../utils/student-list-query"
import { listCopy, studentsCopy } from "../config/students-copy"
import {
  useStudentBulkStatus,
  useStudentLookups,
  useStudentsExport,
  useStudentsList,
} from "../hooks/use-students-list"
import { studentColumns } from "../components/student-columns"
import { StudentsToolbar } from "../components/students-toolbar"
import { StudentsPage } from "../components/students-page"
import { StudentBulkOutcome } from "../components/student-bulk-outcome"

export function StudentsScreen() {
  const [query, setQuery] = useState<StudentListQuery>(defaultStudentListQuery)
  const [outcomes, setOutcomes] = useState<BulkStatusOutcome[]>([])

  const students = useStudentsList(query)
  const lookups = useStudentLookups()
  const exportStudents = useStudentsExport()
  const bulkStatus = useStudentBulkStatus(setOutcomes)

  const columns = useMemo(() => studentColumns, [])
  const patch = (next: Partial<StudentListQuery>) =>
    setQuery((current) => ({ ...current, ...next }))

  const rows = students.data?.items ?? []
  const filtered = hasActiveFilters(query)
  const showEmpty = !students.isLoading && !students.error && rows.length === 0

  return (
    <StudentsPage
      title={studentsCopy.title}
      description={studentsCopy.description}
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {studentsCopy.noCreateNotice}
        </p>

        {lookups.data && (
          <Card>
            <StudentsToolbar
              query={query}
              lookups={lookups.data}
              onChange={patch}
              onClear={() => setQuery(clearFilters(query))}
              onExport={() => exportStudents.mutate(query)}
            />
          </Card>
        )}

        <Card>
          {showEmpty ? (
            <EmptyState
              title={listCopy.emptyTitle}
              description={
                filtered ? listCopy.emptyDescription : studentsCopy.noCreateNotice
              }
            />
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              loading={students.isLoading}
              error={students.error?.message}
              onRetry={() => void students.refetch()}
              getRowId={(row) => row.id}
              onBulkAction={(selected) =>
                bulkStatus.mutate({
                  items: selected.map((row) => ({
                    studentId: row.id,
                    toStatus: "archived",
                    reason: "أرشفة جماعية من قائمة الطلاب",
                    expectedVersion: row.version,
                  })),
                })
              }
              controlled={{
                search: query.search ?? "",
                page: students.data?.page ?? query.page,
                pageSize: query.pageSize,
                total: students.data?.total ?? 0,
                totalPages: students.data?.totalPages ?? 1,
                onSearchChange: (search) => patch({ search, page: 1 }),
                onPageChange: (page) => patch({ page }),
              }}
            />
          )}
          <StudentBulkOutcome outcomes={outcomes} />
        </Card>
      </div>
    </StudentsPage>
  )
}
