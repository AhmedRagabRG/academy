"use client"
import { Dropdown } from "@/shared/components/forms/dropdown"
import type { BatchListQuery } from "../types/commands"
import type { BatchLookups } from "../types/domain"
import { batchStatusLabels } from "./batch-status-badge"
import { Button } from "@workspace/ui/components/button"
import { BatchPermission } from "./program-batch-permission-boundary"
export function ProgramBatchToolbar({
  query,
  lookups,
  onChange,
  onExport,
}: {
  query: BatchListQuery
  lookups: BatchLookups
  onChange: (patch: Partial<BatchListQuery>) => void
  onExport?: () => void
}) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <label className="text-sm">
        الحالة
        <Dropdown
          value={query.status ?? "all"}
          onChange={(e) =>
            onChange({
              status: e.target.value as BatchListQuery["status"],
              page: 1,
            })
          }
          options={[
            { value: "all", label: "كل الحالات" },
            ...Object.entries(batchStatusLabels).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </label>
      <label className="text-sm">
        العام الأكاديمي
        <Dropdown
          value={query.academicYearId ?? ""}
          onChange={(e) =>
            onChange({ academicYearId: e.target.value || undefined, page: 1 })
          }
          options={[
            { value: "", label: "كل الأعوام" },
            ...lookups.academicYears,
          ]}
        />
      </label>
      <label className="text-sm">
        فترة القبول
        <Dropdown
          value={query.intakeId ?? ""}
          onChange={(e) =>
            onChange({ intakeId: e.target.value || undefined, page: 1 })
          }
          options={[{ value: "", label: "كل الفترات" }, ...lookups.intakes]}
        />
      </label>
      <label className="text-sm">
        الفرع
        <Dropdown
          value={query.branchId ?? ""}
          onChange={(e) =>
            onChange({ branchId: e.target.value || undefined, page: 1 })
          }
          options={[
            { value: "", label: "كل الفروع" },
            ...lookups.branches.map((x) => ({
              value: x.value,
              label: x.label,
            })),
          ]}
        />
      </label>
      <label className="text-sm">
        الترتيب
        <Dropdown
          value={query.sort ?? "updatedAt"}
          onChange={(event) =>
            onChange({
              sort: event.target.value as BatchListQuery["sort"],
              page: 1,
            })
          }
          options={[
            { value: "updatedAt", label: "آخر تحديث" },
            { value: "name", label: "اسم الدفعة" },
            { value: "code", label: "الرمز" },
            { value: "status", label: "الحالة" },
          ]}
        />
      </label>
      {onExport && (
        <div className="flex items-end">
          <BatchPermission permission="batches.export">
            <Button type="button" variant="outline" onClick={onExport}>
              تصدير النتائج
            </Button>
          </BatchPermission>
        </div>
      )}
    </div>
  )
}
