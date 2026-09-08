"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { feedback } from "@/shared/components/feedback/toast"
import { usePermission } from "@/shared/hooks/use-permission"
import { pipelinePermissions } from "@/features/lead-pipeline/config/pipeline-permissions"
import { usePipelineAdmin } from "../hooks/use-pipeline-admin"
import { PipelineList } from "../components/pipeline-list"
import { PipelineFormDialog } from "../components/pipeline-form"
import { PipelineDetailHeader } from "../components/pipeline-detail-header"
import { StageList } from "../components/stage-list"
import { StageFormDialog } from "../components/stage-form"
import type { PipelineStageRecord } from "../types/domain"

export function PipelineManagementScreen({
  initialPipelineId,
}: { initialPipelineId?: string } = {}) {
  const admin = usePipelineAdmin(initialPipelineId)
  const canManage = usePermission(pipelinePermissions.manage)
  const [creatingPipeline, setCreatingPipeline] = useState(false)
  const [stageDialog, setStageDialog] = useState<
    { mode: "create" } | { mode: "edit"; stage: PipelineStageRecord } | null
  >(null)
  const [pending, setPending] = useState(false)

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setPending(true)
    try {
      await action()
      if (success) feedback.success(success)
    } catch (error) {
      feedback.error((error as Error).message)
    } finally {
      setPending(false)
    }
  }

  const pipeline = admin.pipeline

  return (
    <PageContainer className="max-w-none">
      <PageHeader
        title="إعدادات مسارات المبيعات"
        description="أنشئ مسارات البيع ومراحلها، وحدّد نقطة الدخول والمسار الافتراضي لكل مؤسسة."
      />

      <div className="grid min-h-[36rem] overflow-hidden rounded-xl border bg-card shadow-[0_18px_50px_-42px_#0b2a4a] lg:grid-cols-[18rem_minmax(0,1fr)]">
        {admin.isListLoading ? (
          <div className="lg:col-span-2">
            <LoadingState label="جارٍ تحميل المسارات" />
          </div>
        ) : admin.listError ? (
          <div className="lg:col-span-2">
            <ErrorState message={(admin.listError as Error).message} />
          </div>
        ) : (
          <>
            <PipelineList
              pipelines={admin.pipelines}
              selectedId={admin.selectedId}
              canCreate={canManage}
              onSelect={(id) => {
                admin.selectPipeline(id)
                setStageDialog(null)
              }}
              onCreate={() => setCreatingPipeline(true)}
            />

            <div className="min-w-0">
              {!admin.pipelines.length ? (
                <EmptyState
                  title="لا توجد مسارات بعد"
                  description="أنشئ أول مسار مبيعات لبدء تسجيل الفرص وتحريكها بين المراحل."
                  action={
                    canManage && (
                      <Button onClick={() => setCreatingPipeline(true)}>
                        <Plus aria-hidden />
                        مسار جديد
                      </Button>
                    )
                  }
                />
              ) : admin.isDetailLoading ? (
                <LoadingState label="جارٍ تحميل بيانات المسار" />
              ) : admin.detailError ? (
                <ErrorState message={(admin.detailError as Error).message} />
              ) : !pipeline ? null : (
                <>
                  <PipelineDetailHeader
                    pipeline={pipeline}
                    pipelineCount={admin.pipelines.length}
                    canManage={canManage}
                    pending={pending}
                    onRename={(name) =>
                      run(
                        () =>
                          admin.renamePipeline(
                            pipeline.id,
                            name,
                            pipeline.version
                          ),
                        "تم حفظ اسم المسار"
                      )
                    }
                    onSetDefault={() =>
                      run(
                        () =>
                          admin.setDefaultPipeline(
                            pipeline.id,
                            pipeline.version
                          ),
                        "أصبح هذا المسار هو الافتراضي"
                      )
                    }
                    onArchive={() =>
                      run(
                        () =>
                          admin.archivePipeline(pipeline.id, pipeline.version),
                        "تمت أرشفة المسار"
                      )
                    }
                    onRestore={() =>
                      run(
                        () =>
                          admin.restorePipeline(pipeline.id, pipeline.version),
                        "تمت استعادة المسار"
                      )
                    }
                    onDelete={() =>
                      run(
                        () =>
                          admin.removePipeline(pipeline.id, pipeline.version),
                        "تم حذف المسار"
                      )
                    }
                  />

                  <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                    <h3 className="text-sm font-medium text-brand-navy dark:text-foreground">
                      المراحل ({pipeline.stages.length})
                    </h3>
                    {canManage && (
                      <Button
                        size="sm"
                        onClick={() => setStageDialog({ mode: "create" })}
                      >
                        <Plus aria-hidden />
                        مرحلة جديدة
                      </Button>
                    )}
                  </div>

                  <StageList
                    stages={pipeline.stages}
                    canManage={canManage}
                    pending={pending}
                    onEdit={(stage) => setStageDialog({ mode: "edit", stage })}
                    onArchive={(stage) =>
                      run(
                        () =>
                          admin.archiveStage(
                            pipeline.id,
                            stage.id,
                            pipeline.version,
                            stage.version
                          ),
                        "تمت أرشفة المرحلة"
                      )
                    }
                    onRestore={(stage) =>
                      run(
                        () =>
                          admin.restoreStage(
                            pipeline.id,
                            stage.id,
                            pipeline.version,
                            stage.version
                          ),
                        "تمت استعادة المرحلة"
                      )
                    }
                    onDelete={(stage) =>
                      run(
                        () =>
                          admin.removeStage(
                            pipeline.id,
                            stage.id,
                            pipeline.version,
                            stage.version
                          ),
                        "تم حذف المرحلة"
                      )
                    }
                    onReorder={(orderedStages) =>
                      run(() =>
                        admin.reorderStages(
                          pipeline.id,
                          pipeline.version,
                          orderedStages.map((stage) => ({
                            id: stage.id,
                            expectedVersion: stage.version,
                          }))
                        )
                      )
                    }
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>

      <PipelineFormDialog
        open={creatingPipeline}
        pending={pending}
        onClose={() => setCreatingPipeline(false)}
        onSubmit={(draft) =>
          run(async () => {
            await admin.createPipeline(draft)
            setCreatingPipeline(false)
          }, "تم إنشاء المسار")
        }
      />

      {pipeline && stageDialog && (
        <StageFormDialog
          open
          pending={pending}
          initial={stageDialog.mode === "edit" ? stageDialog.stage : undefined}
          hasEntryStage={pipeline.stages.some((stage) => stage.isEntry)}
          onClose={() => setStageDialog(null)}
          onSubmit={(draft) =>
            run(
              async () => {
                if (stageDialog.mode === "create") {
                  await admin.createStage(pipeline.id, pipeline.version, draft)
                } else {
                  await admin.updateStage(pipeline.id, stageDialog.stage.id, {
                    expectedPipelineVersion: pipeline.version,
                    expectedVersion: stageDialog.stage.version,
                    name: draft.name,
                    description: draft.description,
                    probability: draft.probability,
                    accent: draft.accent,
                    outcome: draft.outcome,
                    isEntry: draft.isEntry,
                  })
                }
                setStageDialog(null)
              },
              stageDialog.mode === "create"
                ? "تمت إضافة المرحلة"
                : "تم حفظ المرحلة"
            )
          }
        />
      )}
    </PageContainer>
  )
}
