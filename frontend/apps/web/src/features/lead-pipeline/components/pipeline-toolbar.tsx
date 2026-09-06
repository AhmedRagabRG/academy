"use client"

import { Plus, RotateCcw, Search } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { priorityLabels, sourceLabels } from "../config/pipeline-configuration"
import type {
  LeadOutcome,
  LeadPriority,
  LeadSource,
  PipelineAgent,
  PipelineFilters,
} from "../types/domain"

const filterClass =
  "h-10 min-w-40 rounded-lg border border-input bg-background px-3 text-sm"

export function PipelineToolbar({
  filters,
  agents,
  canCreate,
  onChange,
  onClear,
  onCreate,
}: {
  filters: PipelineFilters
  agents: PipelineAgent[]
  canCreate: boolean
  onChange: (patch: Partial<PipelineFilters>) => void
  onClear: () => void
  onCreate: () => void
}) {
  const filtered = Boolean(
    filters.query ||
    filters.agentId ||
    filters.source ||
    filters.priority ||
    filters.outcome
  )

  return (
    <div className="border-b bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-64 flex-1">
          <span className="sr-only">البحث في فرص المبيعات</span>
          <Search
            className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder="ابحث بالاسم أو الهاتف أو البرنامج…"
            className="pe-10"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="تصفية حسب المسؤول"
            className={filterClass}
            value={filters.agentId}
            onChange={(event) => onChange({ agentId: event.target.value })}
          >
            <option value="">كل المسؤولين</option>
            <option value="unassigned">غير مسند</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <select
            aria-label="تصفية حسب القناة"
            className={filterClass}
            value={filters.source}
            onChange={(event) =>
              onChange({ source: event.target.value as LeadSource | "" })
            }
          >
            <option value="">كل القنوات</option>
            {Object.entries(sourceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="تصفية حسب الأولوية"
            className={filterClass}
            value={filters.priority}
            onChange={(event) =>
              onChange({ priority: event.target.value as LeadPriority | "" })
            }
          >
            <option value="">كل الأولويات</option>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="تصفية حسب حالة الفرصة"
            className={filterClass}
            value={filters.outcome}
            onChange={(event) =>
              onChange({ outcome: event.target.value as LeadOutcome | "" })
            }
          >
            <option value="">كل الحالات</option>
            <option value="open">مفتوحة</option>
            <option value="won">مكتسبة</option>
            <option value="lost">غير مكتسبة</option>
          </select>
          {filtered && (
            <Button variant="ghost" onClick={onClear}>
              <RotateCcw aria-hidden />
              مسح التصفية
            </Button>
          )}
          {canCreate && (
            <Button onClick={onCreate}>
              <Plus aria-hidden />
              إضافة فرصة
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
