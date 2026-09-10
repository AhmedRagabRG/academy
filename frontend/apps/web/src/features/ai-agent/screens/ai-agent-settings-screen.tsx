"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { SettingsPage } from "@/features/organization-settings/components/settings-page"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { EmptyState } from "@/shared/components/states/empty-state"
import { usePermission } from "@/shared/hooks/use-permission"
import { useKnowledgeBases } from "@/features/ai-knowledge/hooks/use-ai-knowledge"
import { useInboxLookups } from "@/features/inbox/hooks/use-inbox-list"
import {
  aiAgentPermissions,
  resumeDelayOptions,
} from "../config/ai-agent-permissions"
import { useAiAgents, useUpdateAiAgent } from "../hooks/use-ai-agent"
import type { AiAgent } from "../types/domain"

const field =
  "border-border bg-background min-h-9 w-full rounded-lg border px-3 py-2 text-sm"

export function AiAgentSettingsScreen() {
  const canManage = usePermission(aiAgentPermissions.manage)
  const agents = useAiAgents()
  const bases = useKnowledgeBases()
  const lookups = useInboxLookups()
  const save = useUpdateAiAgent()
  const agent = agents.data?.[0]
  const [draft, setDraft] = useState<AiAgent | null>(null)

  // Re-seed the form whenever the server version moves, so a save made
  // elsewhere is picked up rather than silently overwritten by a stale
  // expectedVersion. Keyed on id+version rather than the object, which is a new
  // reference on every refetch and would clobber in-progress edits.
  const identity = agent ? `${agent.id}:${agent.version}` : null
  const [seeded, setSeeded] = useState<string | null>(null)
  if (agent && identity !== seeded) {
    setSeeded(identity)
    setDraft(agent)
  }

  if (agents.isLoading) return <LoadingState label="جارٍ تحميل الإعدادات" />
  if (agents.isError)
    return (
      <ErrorState
        message="تعذّر تحميل إعدادات المساعد"
        onRetry={() => void agents.refetch()}
      />
    )
  if (!agent || !draft)
    return (
      <SettingsPage
        title="المساعد الذكي"
        description="إعدادات الرد الآلي على محادثات صندوق الوارد."
      >
        <EmptyState
          title="لا يوجد مساعد مهيأ"
          description="شغّل بذور قاعدة البيانات لإنشاء المساعد الافتراضي."
        />
      </SettingsPage>
    )

  const platforms = lookups.data?.platforms ?? []
  const patch = (changes: Partial<AiAgent>) =>
    setDraft((current) => (current ? { ...current, ...changes } : current))
  const toggleIn = (list: string[], value: string) =>
    list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value]

  return (
    <SettingsPage
      title="المساعد الذكي"
      description="إعدادات الرد الآلي على محادثات صندوق الوارد."
      actions={
        canManage ? (
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                id: draft.id,
                expectedVersion: draft.version,
                enabled: draft.enabled,
                systemInstructions: draft.systemInstructions,
                tone: draft.tone,
                responseLanguage: draft.responseLanguage,
                maxResponseChars: draft.maxResponseChars,
                enabledPlatformCodes: draft.enabledPlatformCodes,
                resumeAfterMinutes: draft.resumeAfterMinutes,
                fallbackMessage: draft.fallbackMessage,
                handoffMessage: draft.handoffMessage,
                knowledgeBaseIds: draft.knowledgeBaseIds,
              })
            }
          >
            {save.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        ) : undefined
      }
    >
      <Card className="space-y-4 p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={draft.enabled}
            disabled={!canManage}
            onChange={(event) => patch({ enabled: event.target.checked })}
          />
          <span className="font-medium">تفعيل المساعد الذكي</span>
        </label>
        <p className="text-muted-foreground text-sm">
          يتوقف المساعد فورًا عن أي محادثة يردّ فيها موظف، ولا يعود إليها إلا وفق
          مدة الاستئناف أدناه.
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-medium">القنوات</h2>
        {platforms.length === 0 ? (
          <p className="text-muted-foreground text-sm">لا توجد قنوات متاحة.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {platforms.map((platform) => (
              <label key={platform.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={draft.enabledPlatformCodes.includes(platform.id)}
                  onChange={() =>
                    patch({
                      enabledPlatformCodes: toggleIn(
                        draft.enabledPlatformCodes,
                        platform.id,
                      ),
                    })
                  }
                />
                {platform.label}
              </label>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-medium">قواعد المعرفة</h2>
        {!bases.data?.length ? (
          <p className="text-muted-foreground text-sm">
            لا توجد قواعد معرفة بعد. أنشئ واحدة وأضف إليها مستندات أولًا.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {bases.data.map((base) => (
              <label key={base.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={draft.knowledgeBaseIds.includes(base.id)}
                  onChange={() =>
                    patch({
                      knowledgeBaseIds: toggleIn(draft.knowledgeBaseIds, base.id),
                    })
                  }
                />
                {base.name}
              </label>
            ))}
          </div>
        )}
      </Card>

      <Card className="grid gap-4 p-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block">لغة الرد</span>
          <select
            className={field}
            disabled={!canManage}
            value={draft.responseLanguage}
            onChange={(event) => patch({ responseLanguage: event.target.value })}
          >
            <option value="ar">العربية</option>
            <option value="en">الإنجليزية</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block">نبرة الحديث</span>
          <input
            className={field}
            disabled={!canManage}
            value={draft.tone}
            onChange={(event) => patch({ tone: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block">الحد الأقصى لطول الرد (حرفًا)</span>
          <input
            type="number"
            min={120}
            className={field}
            disabled={!canManage}
            value={draft.maxResponseChars}
            onChange={(event) =>
              patch({ maxResponseChars: Number(event.target.value) })
            }
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block">استئناف المساعد بعد تدخل الموظف</span>
          <select
            className={field}
            disabled={!canManage}
            value={draft.resumeAfterMinutes?.toString() ?? ""}
            onChange={(event) =>
              patch({
                resumeAfterMinutes: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          >
            {resumeDelayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card className="space-y-4 p-4">
        <label className="block text-sm">
          <span className="mb-1 block">تعليمات مخصصة</span>
          <textarea
            className={field}
            rows={4}
            dir="auto"
            disabled={!canManage}
            value={draft.systemInstructions}
            onChange={(event) =>
              patch({ systemInstructions: event.target.value })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">
            رسالة التعذر — تُرسل عندما لا تكفي قاعدة المعرفة للإجابة
          </span>
          <textarea
            className={field}
            rows={2}
            dir="auto"
            disabled={!canManage}
            value={draft.fallbackMessage}
            onChange={(event) => patch({ fallbackMessage: event.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">رسالة التحويل إلى موظف</span>
          <textarea
            className={field}
            rows={2}
            dir="auto"
            disabled={!canManage}
            value={draft.handoffMessage}
            onChange={(event) => patch({ handoffMessage: event.target.value })}
          />
        </label>
      </Card>
    </SettingsPage>
  )
}
