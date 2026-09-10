"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { DeleteDialog } from "@/shared/components/feedback/delete-dialog"
import { priorityLabels } from "../config/ai-agent-permissions"
import type {
  AiAgentId,
  RoutingRule,
  TicketPriority,
} from "../types/domain"

const field =
  "border-border bg-background min-h-9 w-full rounded-lg border px-3 py-2 text-sm"
const CATEGORY_PATTERN = /^[a-z0-9-]+$/

const blank = {
  category: "",
  categoryLabel: "",
  teamId: "",
  priority: "medium" as TicketPriority,
}

/**
 * The categories the agent may choose between when escalating, and where each
 * one lands. The model never supplies a team: it picks a category, and this
 * table decides the rest. A category with no team here still produces a ticket
 * — it just arrives unassigned rather than in the wrong queue.
 */
export function RoutingRulesTable({
  agentId,
  rules,
  teams,
  canManage,
  pending,
  onSave,
  onDelete,
}: {
  agentId: AiAgentId
  rules: RoutingRule[]
  teams: { id: string; label: string }[]
  canManage: boolean
  pending: boolean
  onSave: (input: {
    agentId: AiAgentId
    ruleId?: string
    category: string
    categoryLabel: string
    teamId: string | null
    priority: TicketPriority
    active?: boolean
  }) => void
  onDelete: (input: { agentId: AiAgentId; ruleId: string }) => void
}) {
  const [draft, setDraft] = useState(blank)
  const [pendingDelete, setPendingDelete] = useState<RoutingRule | null>(null)

  const categoryValid = CATEGORY_PATTERN.test(draft.category.trim())
  const taken = rules.some((rule) => rule.category === draft.category.trim())
  const canAdd =
    categoryValid && !taken && draft.categoryLabel.trim().length > 1

  return (
    <div className="space-y-4">
      {rules.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          لا توجد قواعد توجيه. سيُنشئ المساعد التذاكر دون إسناد إلى فريق.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-border border-b">
                <th className="py-2 text-start font-medium">التصنيف</th>
                <th className="py-2 text-start font-medium">الفريق</th>
                <th className="py-2 text-start font-medium">الأولوية</th>
                <th className="py-2 text-start font-medium">الحالة</th>
                {canManage && <th className="py-2 text-start font-medium">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-border/60 border-b">
                  <td className="py-2">
                    {rule.categoryLabel}{" "}
                    <code className="text-muted-foreground text-xs" dir="ltr">
                      {rule.category}
                    </code>
                  </td>
                  <td className="py-2">
                    {teams.find((team) => team.id === rule.teamId)?.label ?? (
                      <span className="text-muted-foreground">دون إسناد</span>
                    )}
                  </td>
                  <td className="py-2">{priorityLabels[rule.priority]}</td>
                  <td className="py-2">
                    <StatusBadge
                      label={rule.active ? "مفعّلة" : "متوقفة"}
                      tone={rule.active ? "success" : "neutral"}
                    />
                  </td>
                  {canManage && (
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            onSave({
                              agentId,
                              ruleId: rule.id,
                              category: rule.category,
                              categoryLabel: rule.categoryLabel,
                              teamId: rule.teamId,
                              priority: rule.priority,
                              active: !rule.active,
                            })
                          }
                        >
                          {rule.active ? "إيقاف" : "تفعيل"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(rule)}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <div className="border-border grid gap-2 rounded-lg border p-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block">مفتاح التصنيف</span>
            <input
              className={field}
              dir="ltr"
              placeholder="billing-issue"
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value })
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">الاسم المعروض</span>
            <input
              className={field}
              placeholder="مشكلة في الرسوم"
              value={draft.categoryLabel}
              onChange={(event) =>
                setDraft({ ...draft, categoryLabel: event.target.value })
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">الفريق</span>
            <select
              className={field}
              value={draft.teamId}
              onChange={(event) =>
                setDraft({ ...draft, teamId: event.target.value })
              }
            >
              <option value="">دون إسناد</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block">الأولوية</span>
            <select
              className={field}
              value={draft.priority}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  priority: event.target.value as TicketPriority,
                })
              }
            >
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-4">
            <Button
              type="button"
              disabled={!canAdd || pending}
              onClick={() => {
                onSave({
                  agentId,
                  category: draft.category.trim(),
                  categoryLabel: draft.categoryLabel.trim(),
                  teamId: draft.teamId || null,
                  priority: draft.priority,
                })
                setDraft(blank)
              }}
            >
              إضافة قاعدة
            </Button>
            {draft.category.trim() && !categoryValid && (
              <p className="text-destructive mt-1 text-xs">
                المفتاح بحروف إنجليزية صغيرة وشرطات فقط، مثل billing-issue
              </p>
            )}
            {taken && (
              <p className="text-destructive mt-1 text-xs">هذا التصنيف موجود بالفعل</p>
            )}
          </div>
        </div>
      )}

      <DeleteDialog
        open={Boolean(pendingDelete)}
        title="حذف قاعدة التوجيه"
        description={`لن يعود المساعد قادرًا على تصنيف الشكاوى كـ"${pendingDelete?.categoryLabel ?? ""}".`}
        pending={pending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          onDelete({ agentId, ruleId: pendingDelete.id })
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
