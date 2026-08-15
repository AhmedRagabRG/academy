"use client"
import Link from "next/link"
import { Archive, BookmarkPlus, Search } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type {
  TicketFilters,
  TicketSort,
  CreateTicketInput,
} from "../types/commands"
import { ticketConfiguration } from "../config/ticket-configuration"
import { useTicketViewStore } from "../store/ticket-view-store"
import { CreateTicketDialog } from "./create-ticket-dialog"
import type { TicketConfiguration } from "../types/domain"
export function TicketBoardHeader({
  search,
  onSearch,
  filters,
  onFilters,
  sort,
  onSort,
  onCreate,
  pending,
  configuration = ticketConfiguration,
}: {
  search: string
  onSearch: (v: string) => void
  filters: TicketFilters
  onFilters: (v: TicketFilters) => void
  sort: TicketSort
  onSort: (v: TicketSort) => void
  onCreate: (v: CreateTicketInput) => Promise<unknown>
  pending?: boolean
  configuration?: TicketConfiguration
}) {
  const { views, addView } = useTicketViewStore(),
    input = "border-border bg-background h-9 rounded-lg border px-3 text-sm"
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-64 flex-1">
          <Search className="absolute start-3 top-2.5 size-4 text-muted-foreground" />
          <span className="sr-only">بحث</span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="ابحث في التذاكر"
            className={`${input} w-full ps-9`}
          />
        </label>
        <select
          aria-label="الترتيب"
          className={input}
          value={sort}
          onChange={(e) => onSort(e.target.value as TicketSort)}
        >
          <option value="updated">آخر تحديث</option>
          <option value="newest">الأحدث</option>
          <option value="oldest">الأقدم</option>
          <option value="priority">الأولوية</option>
        </select>
        <Button
          variant="outline"
          onClick={() =>
            addView({
              id: crypto.randomUUID(),
              name: `عرض ${views.length + 1}`,
              search,
              filters,
              sort,
            })
          }
        >
          <BookmarkPlus />
          حفظ العرض
        </Button>
        <Link
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm"
          href="/tickets/archived"
        >
          <Archive className="size-4" />
          المؤرشف
        </Link>
        <CreateTicketDialog
          configuration={configuration}
          onCreate={onCreate}
          pending={pending}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="تصفية حسب الأولوية"
          className={input}
          value={filters.priorities?.[0] ?? ""}
          onChange={(e) =>
            onFilters({
              ...filters,
              priorities: e.target.value
                ? [e.target.value as never]
                : undefined,
            })
          }
        >
          <option value="">كل الأولويات</option>
          {configuration.priorities.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="تصفية حسب الفريق"
          className={input}
          value={filters.teamIds?.[0] ?? ""}
          onChange={(e) =>
            onFilters({
              ...filters,
              teamIds: e.target.value ? [e.target.value] : undefined,
            })
          }
        >
          <option value="">كل الفرق</option>
          {configuration.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          aria-label="تصفية حسب القسم"
          className={input}
          value={filters.departmentIds?.[0] ?? ""}
          onChange={(e) =>
            onFilters({
              ...filters,
              departmentIds: e.target.value ? [e.target.value] : undefined,
            })
          }
        >
          <option value="">كل الأقسام</option>
          {configuration.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {Object.keys(filters).length > 0 && (
          <Button variant="ghost" onClick={() => onFilters({})}>
            مسح التصفية
          </Button>
        )}
      </div>
    </div>
  )
}
