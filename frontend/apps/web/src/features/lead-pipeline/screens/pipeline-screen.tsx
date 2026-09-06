"use client"

import { useState } from "react"
import Link from "next/link"
import { Contact, TrendingUp } from "lucide-react"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { feedback } from "@/shared/components/feedback/toast"
import { usePermission } from "@/shared/hooks/use-permission"
import { pipelinePermissions } from "../config/pipeline-permissions"
import { usePipelineWorkspace } from "../hooks/use-pipeline-workspace"
import type { LeadStageId } from "../types/domain"
import { PipelineToolbar } from "../components/pipeline-toolbar"
import { PipelineBoard } from "../components/pipeline-board"
import { CreateLeadPanel, LeadDetailPanel } from "../components/lead-inspector"
import { formatPipelineMoney } from "../components/lead-ui"

type InspectorMode = "none" | "create" | "lead"

export function PipelineScreen({
  initialLeadId,
}: { initialLeadId?: string } = {}) {
  const workspace = usePipelineWorkspace(initialLeadId)
  const hasInitialLead = Boolean(initialLeadId && workspace.selectedLead)
  const [inspector, setInspector] = useState<InspectorMode>(
    hasInitialLead ? "lead" : "none"
  )
  const [mobilePane, setMobilePane] = useState<"board" | "details">(
    hasInitialLead ? "details" : "board"
  )
  const canCreate = usePermission(pipelinePermissions.create)
  const canUpdate = usePermission(pipelinePermissions.update)
  const canMove = usePermission(pipelinePermissions.move)

  const openInspector = (mode: Exclude<InspectorMode, "none">) => {
    setInspector(mode)
    setMobilePane("details")
  }
  const closeInspector = () => {
    setInspector("none")
    setMobilePane("board")
  }
  const moveLead = async (leadId: string, stageId: LeadStageId) => {
    const lead = workspace.leads.find((item) => item.id === leadId)
    if (!lead || lead.stageId === stageId) return
    const stage = workspace.definition.stages.find(
      (item) => item.id === stageId
    )
    try {
      await workspace.moveLead(leadId, stageId)
      feedback.success(
        `نُقلت ${lead.contactName} إلى «${stage?.name ?? stageId}»`
      )
    } catch (error) {
      feedback.error((error as Error).message)
    }
  }

  const openLeads = workspace.leads.filter(
    (lead) => lead.stageId !== "won" && lead.stageId !== "lost"
  )
  const openValue = openLeads.reduce((sum, lead) => sum + lead.value, 0)

  return (
    <PageContainer className="max-w-none">
      <PageHeader
        title="مسار المبيعات"
        description="تابع كل فرصة منذ أول تواصل، وحرّكها بين المراحل حتى التسجيل أو الإغلاق."
        actions={
          <Link
            href="/contacts"
            className={buttonVariants({ variant: "outline" })}
          >
            <Contact aria-hidden />
            جهات الاتصال
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_18px_50px_-42px_#0b2a4a]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue">
              <TrendingUp className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-brand-navy dark:text-foreground">
                {workspace.definition.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {workspace.definition.stages.length} مراحل · يُحدّث تلقائيًا من
                القنوات
              </p>
            </div>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <div>
              <dt className="text-muted-foreground">الفرص المفتوحة</dt>
              <dd className="mt-1 font-medium" data-numeric>
                {openLeads.length}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">قيمة المسار</dt>
              <dd className="mt-1 font-medium" data-numeric>
                {formatPipelineMoney(openValue)}
              </dd>
            </div>
          </dl>
        </div>

        <PipelineToolbar
          filters={workspace.filters}
          agents={workspace.agents}
          canCreate={canCreate}
          onChange={workspace.patchFilters}
          onClear={workspace.clearFilters}
          onCreate={() => openInspector("create")}
        />

        <div
          className={cn(
            "grid min-h-[32rem]",
            inspector !== "none" && "xl:grid-cols-[minmax(0,1fr)_24rem]"
          )}
        >
          <section
            aria-label="لوحة فرص المبيعات"
            className={cn(
              "min-w-0",
              mobilePane === "board" ? "block" : "hidden xl:block"
            )}
          >
            <PipelineBoard
              stages={workspace.definition.stages}
              leads={workspace.filteredLeads}
              agents={workspace.agents}
              canMove={canMove}
              onOpen={(leadId) => {
                workspace.selectLead(leadId)
                openInspector("lead")
              }}
              onMove={moveLead}
            />
          </section>

          {inspector !== "none" && (
            <div
              className={cn(
                "min-h-0 border-t xl:block xl:border-s xl:border-t-0",
                mobilePane === "details" ? "block" : "hidden"
              )}
            >
              {inspector === "create" && (
                <CreateLeadPanel
                  contacts={workspace.contacts}
                  agents={workspace.agents}
                  onBack={closeInspector}
                  onCreate={async (draft) => {
                    try {
                      const lead = await workspace.createLead(draft)
                      setInspector("lead")
                      feedback.success(`تم إنشاء فرصة ${lead.contactName}`)
                    } catch (error) {
                      feedback.error((error as Error).message)
                    }
                  }}
                />
              )}
              {inspector === "lead" && workspace.selectedLead && (
                <LeadDetailPanel
                  key={workspace.selectedLead.id}
                  lead={workspace.selectedLead}
                  stages={workspace.definition.stages}
                  agents={workspace.agents}
                  contacts={workspace.contacts}
                  canUpdate={canUpdate}
                  canMove={canMove}
                  onBack={closeInspector}
                  onMove={(stageId) =>
                    moveLead(workspace.selectedLead!.id, stageId)
                  }
                  onUpdate={async (draft) => {
                    try {
                      await workspace.updateLead(
                        workspace.selectedLead!.id,
                        draft
                      )
                      feedback.success("تم حفظ بيانات الفرصة")
                    } catch (error) {
                      feedback.error((error as Error).message)
                    }
                  }}
                  onAddNote={async (note) => {
                    try {
                      await workspace.addNote(workspace.selectedLead!.id, note)
                      feedback.success("تمت إضافة المتابعة")
                    } catch (error) {
                      feedback.error((error as Error).message)
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
