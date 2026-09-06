"use client"
import { useRouter } from "next/navigation"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { Card } from "@/shared/components/layout/card"
import { LoadingState } from "@/shared/components/states/loading-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { TicketPriorityBadge } from "../components/ticket-priority-badge"
import { TicketStatusMenu } from "../components/ticket-status-menu"
import { TicketAssignmentPanel } from "../components/ticket-assignment-panel"
import { TicketCommentsPanel } from "../components/ticket-comments-panel"
import { TicketAttachmentsPanel } from "../components/ticket-attachments-panel"
import { TicketActivityTimeline } from "../components/ticket-activity-timeline"
import { TicketGovernanceActions } from "../components/ticket-governance-actions"
import { useTicketDetail } from "../hooks/use-ticket-detail"
import { useTicketMutations } from "../hooks/use-ticket-mutations"
import type { TicketId, TicketPriority } from "../types/common"

export function TicketDetailScreen({ ticketId }: { ticketId: TicketId }) {
  const router = useRouter(),
    state = useTicketDetail(ticketId),
    actions = useTicketMutations(state.actor, state.scope),
    ticket = state.detail.data,
    config = state.configuration.data
  if (state.detail.isLoading)
    return (
      <PageContainer>
        <LoadingState label="جارٍ تحميل مساحة التذكرة" />
      </PageContainer>
    )
  if (state.detail.error || !ticket)
    return (
      <PageContainer>
        <ErrorState
          message={state.detail.error?.message ?? "التذكرة غير متاحة"}
          onRetry={() => void state.detail.refetch()}
        />
      </PageContainer>
    )
  const pending = Object.values(actions).some((action) => action.isPending)
  return (
    <PageContainer>
      <PageHeader
        title={ticket.title}
        description={ticket.description}
        actions={
          <TicketGovernanceActions
            ticket={ticket}
            pending={pending}
            onArchive={() =>
              actions.archive.mutate({ id: ticket.id, version: ticket.version })
            }
            onRestore={() =>
              actions.restore.mutate({ id: ticket.id, version: ticket.version })
            }
            onDelete={() =>
              actions.remove.mutate(
                { id: ticket.id },
                { onSuccess: () => router.push("/tickets") }
              )
            }
          />
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <bdi dir="ltr" className="font-medium">
                {ticket.number}
              </bdi>
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketStatusMenu
                current={ticket.status}
                disabled={
                  !ticket.capabilities.changeStatus ||
                  ticket.status === "archived"
                }
                onMove={(status) =>
                  actions.status.mutate({
                    id: ticket.id,
                    status,
                    version: ticket.version,
                  })
                }
              />
              <label className="text-sm">
                الأولوية{" "}
                <select
                  aria-label="تغيير الأولوية"
                  value={ticket.priority}
                  disabled={!ticket.capabilities.changePriority}
                  onChange={(e) =>
                    actions.priority.mutate({
                      id: ticket.id,
                      priority: e.target.value as TicketPriority,
                      version: ticket.version,
                    })
                  }
                  className="ms-1 rounded border border-border bg-background p-1"
                >
                  {config?.priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">العميل</dt>
                <dd>{ticket.customerName ?? "غير مرتبط"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">الطالب</dt>
                <dd>{ticket.studentName ?? "غير مرتبط"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">المحادثة</dt>
                <dd>{ticket.conversationName ?? "لا توجد محادثة مرتبطة"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">تاريخ الإنشاء</dt>
                <dd>
                  <bdi dir="ltr">
                    {new Intl.DateTimeFormat("ar-EG", {
                      dateStyle: "medium",
                    }).format(new Date(ticket.createdAt))}
                  </bdi>
                </dd>
              </div>
            </dl>
          </Card>
          {config && (
            <Card>
              <TicketAssignmentPanel
                ticket={ticket}
                config={config}
                pending={actions.assignment.isPending}
                onAssign={(value) =>
                  actions.assignment.mutate({
                    id: ticket.id,
                    ...value,
                    version: ticket.version,
                  })
                }
              />
            </Card>
          )}
          <Card>
            <TicketCommentsPanel
              comments={ticket.comments}
              actorId={state.actor.userId}
              allowed={ticket.capabilities.comment}
              pending={actions.comment.isPending}
              onAdd={(message) =>
                actions.comment.mutateAsync({ id: ticket.id, message })
              }
              onEdit={(commentId, message) =>
                actions.editComment.mutate({
                  id: ticket.id,
                  commentId,
                  message,
                })
              }
              onDelete={(commentId) =>
                actions.deleteComment.mutate({ id: ticket.id, commentId })
              }
            />
          </Card>
          <Card>
            <TicketAttachmentsPanel
              attachments={ticket.attachments}
              pending={actions.upload.isPending}
              onUpload={(file) =>
                actions.upload.mutate({ id: ticket.id, file })
              }
            />
          </Card>
        </div>
        <aside>
          <Card className="xl:sticky xl:top-4">
            <TicketActivityTimeline activity={ticket.activity} />
          </Card>
        </aside>
      </div>
    </PageContainer>
  )
}
