"use client"

import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ContactRound, ExternalLink, GitBranch } from "lucide-react"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { contactsPermissions } from "@/features/contacts/config/contacts-permissions"
import { pipelinePermissions } from "@/features/lead-pipeline/config/pipeline-permissions"
import { pipelineService } from "@/features/lead-pipeline/services/active-pipeline-service"
import { pipelineKeys } from "@/features/lead-pipeline/services/pipeline-query-keys"
import type { LeadStageId } from "@/features/lead-pipeline/types/domain"
import { feedback } from "@/shared/components/feedback/toast"
import { usePermission } from "@/shared/hooks/use-permission"
import { inboxKeys } from "../services/inbox-query-keys"
import type { ConversationDetail } from "../types/projections"

/**
 * Shows the CRM records this conversation is attached to.
 *
 * The link itself is the API's: a contact and an open lead are created when the
 * first message arrives, so this panel reads that state rather than trying to
 * reconstruct it. Until ingestion has run — a seeded conversation that never
 * came through a channel — there is simply nothing to show yet.
 */
export function ConversationCrmPanel({
  conversation,
}: {
  conversation: ConversationDetail
}) {
  const client = useQueryClient()
  const crm = conversation.crm
  const canViewContacts = usePermission(contactsPermissions.view)
  const canUpdateContacts = usePermission(contactsPermissions.update)
  const canViewPipeline = usePermission(pipelinePermissions.view)
  const canMovePipeline = usePermission(pipelinePermissions.move)

  const definition = useQuery({
    queryKey: pipelineKeys.definition,
    queryFn: ({ signal }) => pipelineService.definition(signal),
    staleTime: Infinity,
    enabled: Boolean(crm?.lead),
  })

  const move = useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: LeadStageId }) =>
      pipelineService.moveLead(leadId, stageId),
    onSuccess: async (_lead, { stageId }) => {
      const stage = definition.data?.stages.find((item) => item.id === stageId)
      await Promise.all([
        client.invalidateQueries({ queryKey: pipelineKeys.leadLists() }),
        client.invalidateQueries({
          queryKey: inboxKeys.detail(conversation.id),
        }),
      ])
      feedback.success(`نُقلت الفرصة إلى «${stage?.name ?? stageId}»`)
    },
    onError: (error: Error) => feedback.error(error.message),
  })

  return (
    <section
      className="space-y-4 border-b pb-5"
      aria-labelledby="conversation-crm-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            id="conversation-crm-title"
            className="inline-flex items-center gap-2 font-medium"
          >
            <GitBranch className="size-4 text-brand-blue" aria-hidden />
            متابعة العميل
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {crm
              ? "محفوظ تلقائيًا في جهات الاتصال ومسار المبيعات"
              : "سيُربط تلقائيًا عند وصول رسالة من القناة"}
          </p>
        </div>
        <span
          className={cn(
            "mt-0.5 size-2 rounded-full ring-4",
            crm
              ? "bg-emerald-500 ring-emerald-500/10"
              : "bg-muted-foreground/40 ring-muted-foreground/10"
          )}
        />
      </div>

      {crm?.lead && (
        <label className="grid gap-1.5 text-sm font-medium">
          مرحلة الفرصة
          <select
            value={crm.lead.stageId}
            disabled={!canMovePipeline || move.isPending}
            onChange={(event) =>
              move.mutate({
                leadId: crm.lead!.id,
                stageId: event.target.value as LeadStageId,
              })
            }
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            aria-label={`مرحلة فرصة ${conversation.customer.name}`}
          >
            {(definition.data?.stages ?? []).map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name} · {stage.probability}%
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-2">
        {crm && canViewContacts && (
          <Link
            href={`/contacts?contact=${crm.contactId}${canUpdateContacts ? "&edit=1" : ""}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full justify-between"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <ContactRound aria-hidden />
              {canUpdateContacts ? "فتح وتعديل جهة الاتصال" : "فتح جهة الاتصال"}
            </span>
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        )}
        {crm?.lead && canViewPipeline && (
          <Link
            href={`/lead-pipeline?lead=${crm.lead.id}`}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full justify-between text-muted-foreground"
            )}
          >
            عرض الفرصة في المسار
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  )
}
