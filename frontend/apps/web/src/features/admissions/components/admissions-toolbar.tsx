"use client"

import { Download, RotateCcw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Dropdown } from "@/shared/components/forms/dropdown"
import type { AdmissionListQuery } from "../types/commands"
import type { AdmissionLookups } from "../types/domain"
import { admissionStatusLabels } from "../config/admissions-copy"
import { AdmissionsPermission } from "./admissions-page"

export function AdmissionsToolbar({
  query,
  lookups,
  onChange,
  onExport,
}: {
  query: AdmissionListQuery
  lookups: AdmissionLookups
  onChange: (patch: Partial<AdmissionListQuery>) => void
  onExport: () => void
}) {
  const active = [
    query.branchId,
    query.offeringId,
    query.batchId,
    query.status && query.status !== "all" ? query.status : undefined,
    query.admissionsEmployeeId,
  ].filter(Boolean).length
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1 text-xs">
          الحالة
          <Dropdown
            value={query.status ?? "all"}
            onChange={(event) =>
              onChange({
                status: event.target.value as AdmissionListQuery["status"],
                page: 1,
              })
            }
            options={[
              { value: "all", label: "كل الحالات" },
              ...Object.entries(admissionStatusLabels).map(
                ([value, label]) => ({ value, label })
              ),
            ]}
          />
        </label>
        <label className="space-y-1 text-xs">
          الفرع
          <Dropdown
            value={query.branchId ?? ""}
            onChange={(event) =>
              onChange({ branchId: event.target.value || undefined, page: 1 })
            }
            options={[{ value: "", label: "كل الفروع" }, ...lookups.branches]}
          />
        </label>
        <label className="space-y-1 text-xs">
          المنتج
          <Dropdown
            value={query.offeringId ?? ""}
            onChange={(event) =>
              onChange({ offeringId: event.target.value || undefined, page: 1 })
            }
            options={[
              { value: "", label: "كل المنتجات" },
              ...lookups.offerings.map((item) => ({
                value: item.id,
                label: item.name.ar,
              })),
            ]}
          />
        </label>
        <label className="space-y-1 text-xs">
          الدفعة
          <Dropdown
            value={query.batchId ?? ""}
            onChange={(event) =>
              onChange({ batchId: event.target.value || undefined, page: 1 })
            }
            options={[
              { value: "", label: "كل الدفعات" },
              ...lookups.batches.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
          />
        </label>
        <label className="space-y-1 text-xs">
          موظف القبول
          <Dropdown
            value={query.admissionsEmployeeId ?? ""}
            onChange={(event) =>
              onChange({
                admissionsEmployeeId: event.target.value || undefined,
                page: 1,
              })
            }
            options={[
              { value: "", label: "كل الموظفين" },
              ...lookups.employees,
            ]}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {active ? `${active} عوامل تصفية نشطة` : "لا توجد عوامل تصفية"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                branchId: undefined,
                offeringId: undefined,
                batchId: undefined,
                status: "all",
                admissionsEmployeeId: undefined,
                page: 1,
              })
            }
          >
            <RotateCcw aria-hidden />
            إعادة الضبط
          </Button>
          <AdmissionsPermission permission="admissions.export">
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download aria-hidden />
              تصدير
            </Button>
          </AdmissionsPermission>
        </div>
      </div>
    </div>
  )
}
