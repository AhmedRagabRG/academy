"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import type { AdmissionListQuery } from "../types/commands"
import { defaultAdmissionListQuery } from "../utils/admission-list-query"
import { admissionsCopy } from "../config/admissions-copy"
import {
  useAdmissionBulkTransition,
  useAdmissionLookups,
  useAdmissionsExport,
  useAdmissionsList,
} from "../hooks/use-admissions-list"
import {
  AdmissionsPage,
  AdmissionsPermission,
} from "../components/admissions-page"
import { admissionColumns } from "../components/admission-columns"
import { AdmissionsToolbar } from "../components/admissions-toolbar"
import { AdmissionBulkOutcome } from "../components/admission-bulk-outcome"

export function AdmissionsScreen() {
  const [query, setQuery] = useState<AdmissionListQuery>(
    defaultAdmissionListQuery
  )
  const admissions = useAdmissionsList(query),
    lookups = useAdmissionLookups(),
    exportAdmissions = useAdmissionsExport(),
    bulkTransition = useAdmissionBulkTransition()
  const [bulkOutcome, setBulkOutcome] = useState<{
    success: number
    failed: number
  }>()
  const columns = useMemo(() => admissionColumns, [])
  const exportRows = () => exportAdmissions.mutate(query)
  return (
    <AdmissionsPage
      title={admissionsCopy.title}
      description={admissionsCopy.description}
      actions={
        <AdmissionsPermission permission="admissions.create">
          <Button
            nativeButton={false}
            render={<Link href="/admissions/create" />}
          >
            <UserPlus aria-hidden />
            {admissionsCopy.create}
          </Button>
        </AdmissionsPermission>
      }
    >
      <div className="space-y-4">
        {lookups.data && (
          <Card>
            <AdmissionsToolbar
              query={query}
              lookups={lookups.data}
              onChange={(patch) =>
                setQuery((current) => ({ ...current, ...patch }))
              }
              onExport={exportRows}
            />
          </Card>
        )}
        <Card>
          <DataTable
            data={admissions.data?.items ?? []}
            columns={columns}
            loading={admissions.isLoading}
            error={admissions.error?.message}
            onRetry={() => void admissions.refetch()}
            onBulkAction={(rows) =>
              bulkTransition.mutate(
                rows.map((row) => ({
                  admissionId: row.id,
                  toStatus: "archived",
                  reason: "إجراء جماعي من قائمة القبول",
                  expectedVersion: row.version,
                })),
                {
                  onSuccess: (outcomes) => {
                    const success = outcomes.filter(
                      (item) => item.success
                    ).length
                    setBulkOutcome({
                      success,
                      failed: outcomes.length - success,
                    })
                  },
                }
              )
            }
            getRowId={(row) => row.id}
            controlled={{
              search: query.search ?? "",
              page: admissions.data?.page ?? query.page,
              pageSize: query.pageSize,
              total: admissions.data?.total ?? 0,
              totalPages: admissions.data?.totalPages ?? 1,
              onSearchChange: (search) =>
                setQuery((current) => ({ ...current, search, page: 1 })),
              onPageChange: (page) =>
                setQuery((current) => ({ ...current, page })),
            }}
          />
          {bulkOutcome && <AdmissionBulkOutcome {...bulkOutcome} />}
        </Card>
      </div>
    </AdmissionsPage>
  )
}
