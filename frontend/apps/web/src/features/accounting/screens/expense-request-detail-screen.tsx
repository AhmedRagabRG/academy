"use client"

import { useRef, useState } from "react"
import { Ban, Save, Send } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { Card } from "@/shared/components/layout/card"
import { Section } from "@/shared/components/layout/section"
import { formatMoney } from "@/shared/utils/money"
import type { ExpenseRequestId } from "../types/common"
import {
  accountingCopy,
  approvalCopy,
  commentCopy,
  historyCopy,
  requestCopy,
} from "../config/accounting-copy"
import { accountingPermissions } from "../config/accounting-permissions"
import {
  toCommandInput,
  type ExpenseRequestFormValues,
} from "../schemas/expense-request-schemas"
import {
  ExpenseRequestForm,
  validateExpenseRequest,
} from "../forms/expense-request-form"
import { useAccountingLookups } from "../hooks/use-accounting-lookups"
import {
  useCancelRequest,
  useExpenseRequest,
  useSubmitRequest,
  useUpdateRequest,
} from "../hooks/use-expense-requests"
import {
  useRemoveAttachment,
  useUploadAttachment,
} from "../hooks/use-attachments"
import {
  AccountingAreaState,
  AccountingBidiValue,
} from "../components/accounting-area-states"
import { ExpenseStatusBadge } from "../components/expense-status-badge"
import { AttachmentPanel } from "../components/attachment-panel"
import {
  CancelRequestDialog,
  SubmitRequestDialog,
} from "../components/request-action-dialogs"
import { DecisionPanel } from "../components/decision-panel"
import {
  useDecideRequest,
  useMarkPaid,
  useStartReview,
} from "../hooks/use-request-decisions"
import { ApprovalTimeline } from "../components/approval-timeline"
import { CommentsPanel } from "../components/comments-panel"
import { useAddComment, useComments } from "../hooks/use-request-history"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })
const formatDate = (value?: string) => {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

export function ExpenseRequestDetailScreen({
  requestId,
}: {
  requestId: string
}) {
  const id = requestId as ExpenseRequestId
  const request = useExpenseRequest(id)
  const lookups = useAccountingLookups()
  const update = useUpdateRequest()
  const submit = useSubmitRequest()
  const cancel = useCancelRequest()
  const upload = useUploadAttachment()
  const remove = useRemoveAttachment()
  const startReview = useStartReview()
  const decide = useDecideRequest()
  const markPaid = useMarkPaid()
  const comments = useComments(id)
  const addComment = useAddComment()

  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<ExpenseRequestFormValues | undefined>(
    undefined
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitOpen, setSubmitOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const detail = request.data

  const options = lookups.data && {
    precision: lookups.data.precision,
    branches: lookups.data.branches,
    categories: lookups.data.categories.map((category) => ({
      id: category.id,
      name: category.name,
      status: category.status,
    })),
    subCategories: lookups.data.subCategories.map((subCategory) => ({
      id: subCategory.id,
      categoryId: subCategory.categoryId,
      name: subCategory.name,
      status: subCategory.status,
    })),
  }

  const startEditing = () => {
    if (!detail) return
    setValues({
      requestDate: detail.requestDate.slice(0, 10),
      branchId: detail.branchId,
      categoryId: detail.categoryId,
      subCategoryId: detail.subCategoryId ?? "",
      description: detail.description,
      amount: detail.amount.amount,
    })
    setErrors({})
    setEditing(true)
  }

  const saveEdit = () => {
    if (!detail || !values || !options) return
    const result = validateExpenseRequest(values, options)
    if (!result.ok) {
      setErrors(result.errors)
      // Move focus to the first invalid field rather than leaving the user hunting.
      const first = Object.keys(result.errors)[0]
      if (first)
        formRef.current?.querySelector<HTMLElement>(`[id$="-${first}"]`)?.focus()
      return
    }
    setErrors({})
    update.mutate(
      {
        requestId: id,
        input: toCommandInput(values),
        expectedVersion: detail.version,
      },
      { onSuccess: () => setEditing(false) }
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={
          detail
            ? `${requestCopy.number} ${detail.requestNumber}`
            : requestCopy.title
        }
        actions={
          detail && (
            <div className="flex flex-wrap gap-2">
              {detail.permissions.update && !editing && (
                <Button variant="outline" onClick={startEditing}>
                  تعديل
                </Button>
              )}
              {editing && (
                <Button onClick={saveEdit} disabled={update.isPending}>
                  <Save aria-hidden />
                  حفظ
                </Button>
              )}
              {detail.permissions.submit && !editing && (
                <Button onClick={() => setSubmitOpen(true)}>
                  <Send aria-hidden />
                  {requestCopy.submit}
                </Button>
              )}
              {detail.permissions.cancel && !editing && (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  <Ban aria-hidden />
                  {requestCopy.cancel}
                </Button>
              )}
            </div>
          )
        }
      />

      <AccountingAreaState
        permission={accountingPermissions.requestsView}
        loading={request.isLoading}
        error={request.error}
        onRetry={() => void request.refetch()}
        loadingLabel="جارٍ تحميل الطلب"
      >
        {detail && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <ExpenseStatusBadge status={detail.status} />
              <p className="text-muted-foreground text-sm">
                {detail.derived.isEditable
                  ? requestCopy.editableNotice
                  : requestCopy.lockedNotice}
              </p>
            </div>

            {editing && values && options ? (
              <div ref={formRef}>
                <Card>
                  <ExpenseRequestForm
                    values={values}
                    errors={errors}
                    options={options}
                    onChange={setValues}
                  />
                </Card>
              </div>
            ) : (
              <>
                <Section title={requestCopy.section.request}>
                  <Card>
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Field
                        label={requestCopy.number}
                        value={detail.requestNumber}
                        bidi
                      />
                      <Field
                        label={requestCopy.requestDate}
                        value={formatDate(detail.requestDate)}
                        bidi
                      />
                      <Field label={requestCopy.branch} value={detail.branchLabel} />
                      <Field
                        label={requestCopy.requestedBy}
                        value={detail.requestedBy.name}
                      />
                    </dl>
                  </Card>
                </Section>

                <Section title={requestCopy.section.expense}>
                  <Card>
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Field
                        label={requestCopy.category}
                        value={
                          detail.categoryStatus === "archived"
                            ? `${detail.categoryLabel} (مؤرشف)`
                            : detail.categoryLabel
                        }
                      />
                      {detail.subCategoryLabel && (
                        <Field
                          label={requestCopy.subCategory}
                          value={detail.subCategoryLabel}
                        />
                      )}
                      <Field
                        label={requestCopy.amount}
                        value={formatMoney(detail.amount)}
                        bidi
                      />
                    </dl>
                    <p className="mt-4 text-sm">{detail.description}</p>
                  </Card>
                </Section>
              </>
            )}

            {(detail.permissions.review ||
              detail.permissions.decide ||
              detail.permissions.markPaid ||
              detail.decision ||
              detail.reviewer) && (
              <Section title={approvalCopy.title}>
                <DecisionPanel
                  request={detail}
                  pending={
                    startReview.isPending || decide.isPending || markPaid.isPending
                  }
                  onStartReview={() =>
                    startReview.mutate({
                      requestId: id,
                      expectedVersion: detail.version,
                    })
                  }
                  onDecide={(decision, note) =>
                    decide.mutate({
                      requestId: id,
                      decision,
                      note,
                      expectedVersion: detail.version,
                    })
                  }
                  onMarkPaid={() =>
                    markPaid.mutate({
                      requestId: id,
                      expectedVersion: detail.version,
                    })
                  }
                />
              </Section>
            )}

            <Section title={requestCopy.section.attachments}>
              {lookups.data && (
                <AttachmentPanel
                  attachments={detail.attachments}
                  policy={lookups.data.attachments}
                  editable={detail.permissions.manageAttachments}
                  pending={upload.isPending || remove.isPending}
                  onUpload={(file) =>
                    upload.mutate({
                      requestId: id,
                      expectedVersion: detail.version,
                      ...file,
                    })
                  }
                  onRemove={(attachmentId) =>
                    remove.mutate({
                      requestId: id,
                      attachmentId,
                      expectedVersion: detail.version,
                    })
                  }
                />
              )}
            </Section>

            {detail.permissions.viewHistory && (
              <Section title={historyCopy.title}>
                <ApprovalTimeline history={detail.history} />
              </Section>
            )}

            <Section title={commentCopy.title}>
              <CommentsPanel
                comments={comments.data ?? detail.comments}
                canAdd={detail.permissions.addComment}
                pending={addComment.isPending}
                onAdd={(body) => addComment.mutate({ requestId: id, body })}
              />
            </Section>

            <p className="text-muted-foreground text-xs">
              {accountingCopy.noDeleteNotice}
            </p>
          </div>
        )}
      </AccountingAreaState>

      <SubmitRequestDialog
        open={submitOpen}
        pending={submit.isPending}
        onClose={() => setSubmitOpen(false)}
        onConfirm={() => {
          if (!detail) return
          submit.mutate(
            { requestId: id, expectedVersion: detail.version },
            { onSettled: () => setSubmitOpen(false) }
          )
        }}
      />

      <CancelRequestDialog
        open={cancelOpen}
        pending={cancel.isPending}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => {
          if (!detail) return
          cancel.mutate(
            { requestId: id, reason, expectedVersion: detail.version },
            { onSettled: () => setCancelOpen(false) }
          )
        }}
      />
    </PageContainer>
  )
}

function Field({
  label,
  value,
  bidi,
}: {
  label: string
  value: string
  bidi?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 font-medium">
        {bidi ? <AccountingBidiValue>{value}</AccountingBidiValue> : value}
      </dd>
    </div>
  )
}
