"use client"

import { Download, FilterX } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { FilterBar } from "@/shared/components/data-table/filter-bar"
import { Dropdown } from "@/shared/components/forms/dropdown"
import type { StudentListQuery } from "../types/commands"
import type { StudentLookups } from "../types/domain"
import { studentsCopy, studentFieldsCopy, listCopy } from "../config/students-copy"
import { hasActiveFilters } from "../utils/student-list-query"
import { StudentPermission } from "./student-area-states"
import { studentsPermissions } from "../config/students-permissions"

interface FilterSelectProps {
  id: string
  label: string
  value?: string
  options: { value: string; label: string }[]
  onChange: (value: string | undefined) => void
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: FilterSelectProps) {
  return (
    <span className="flex flex-col gap-1">
      <label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </label>
      <Dropdown
        id={id}
        className="h-10 min-w-44"
        value={value ?? ""}
        options={[{ value: "", label: "الكل" }, ...options]}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
    </span>
  )
}

/**
 * Filter controls for the student list. Every option set comes from service
 * lookups — nothing here is a hardcoded business entity.
 */
export function StudentsToolbar({
  query,
  lookups,
  onChange,
  onClear,
  onExport,
}: {
  query: StudentListQuery
  lookups: StudentLookups
  onChange: (patch: Partial<StudentListQuery>) => void
  onClear: () => void
  onExport: () => void
}) {
  const single = (values?: string[]) => values?.[0]
  const wrap = (value: string | undefined) => (value ? [value] : undefined)
  const active = lookups.branches.filter((branch) => branch.active)

  return (
    <div className="space-y-3">
      <FilterBar>
        <FilterSelect
          id="student-filter-branch"
          label={studentFieldsCopy.registrationBranch}
          value={single(query.branchIds)}
          options={active}
          onChange={(value) => onChange({ branchIds: wrap(value), page: 1 })}
        />
        <FilterSelect
          id="student-filter-department"
          label={studentFieldsCopy.department}
          value={single(query.departmentIds)}
          options={lookups.departments}
          onChange={(value) =>
            onChange({ departmentIds: wrap(value), page: 1 })
          }
        />
        <FilterSelect
          id="student-filter-offering"
          label="المنتج الأكاديمي"
          value={single(query.offeringIds)}
          options={lookups.offerings}
          onChange={(value) => onChange({ offeringIds: wrap(value), page: 1 })}
        />
        <FilterSelect
          id="student-filter-batch"
          label="المجموعة"
          value={single(query.batchIds)}
          options={lookups.batches}
          onChange={(value) => onChange({ batchIds: wrap(value), page: 1 })}
        />
        <FilterSelect
          id="student-filter-status"
          label={studentFieldsCopy.status}
          value={single(query.statuses)}
          options={lookups.statuses.map((status) => ({
            value: status.value,
            label: status.label,
          }))}
          onChange={(value) =>
            onChange({
              statuses: wrap(value) as StudentListQuery["statuses"],
              page: 1,
            })
          }
        />
        <FilterSelect
          id="student-filter-employee"
          label={studentFieldsCopy.customerServiceEmployee}
          value={single(query.customerServiceEmployeeIds)}
          options={lookups.customerServiceEmployees}
          onChange={(value) =>
            onChange({ customerServiceEmployeeIds: wrap(value), page: 1 })
          }
        />
      </FilterBar>
      <div className="flex flex-wrap items-center gap-2">
        {hasActiveFilters(query) && (
          <Button variant="outline" onClick={onClear}>
            <FilterX aria-hidden />
            {listCopy.clearFilters}
          </Button>
        )}
        <StudentPermission permission={studentsPermissions.export}>
          <Button variant="outline" onClick={onExport}>
            <Download aria-hidden />
            {studentsCopy.export}
          </Button>
        </StudentPermission>
      </div>
    </div>
  )
}
