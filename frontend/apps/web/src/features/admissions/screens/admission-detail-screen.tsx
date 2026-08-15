"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { resolveAdmissionEnrollmentHandler } from "../services/admission-enrollment-registry"
import { Pencil } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import type { AdmissionDocument } from "../types/domain"
import type { AdmissionId, AdmissionStatus } from "../types/common"
import { admissionStatusLabels } from "../config/admissions-copy"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
import {
  useAdmission,
  useArchiveApplicant,
} from "../hooks/use-admission-mutations"
import {
  useAdmissionDocuments,
  useReplaceAdmissionDocument,
  useUploadAdmissionDocument,
  useVerifyAdmissionDocument,
  useWithdrawAdmissionDocument,
} from "../hooks/use-admission-documents"
import { useAdmissionFinancialHistory } from "../hooks/use-admission-finance"
import {
  useAdmissionLifecycle,
  useEnrollmentReadiness,
  useTransitionAdmission,
} from "../hooks/use-admission-lifecycle"
import {
  AdmissionsPage,
  AdmissionsPermission,
  AdmissionQueryState,
  AdmissionBidiValue,
} from "../components/admissions-page"
import { AdmissionStatusBadge } from "../components/admission-status-badge"
import { AdmissionEligibilitySummary } from "../components/admission-eligibility-summary"
import { AdmissionReadinessPanel } from "../components/admission-readiness-panel"
import { AdmissionTransitionDialog } from "../components/admission-transition-dialog"
import { AdmissionLifecycleTimeline } from "../components/admission-lifecycle-timeline"
import { AdmissionApprovalSummary } from "../components/admission-approval-summary"
import { AdmissionFinancialSummary } from "../components/admission-financial-summary"
import { AdmissionFinancialHistory } from "../components/admission-financial-history"
import { AdmissionDocumentsSection } from "../forms/admission-documents-section"
import { AdmissionDocumentState } from "../components/admission-document-state"
import { ArchiveApplicantDialog } from "../components/archive-applicant-dialog"

const reasonRequired = new Set<AdmissionStatus>([
  "draft",
  "rejected",
  "archived",
])

/** The stages where a submit or approve decision is still ahead of the record. */
const PENDING_DECISION = new Set<AdmissionStatus>([
  "draft",
  "submitted",
  "under-review",
])
export function AdmissionDetailScreen({
  admissionId: raw,
}: {
  admissionId: string
}) {
  const admissionId = raw as AdmissionId
  const detail = useAdmission(admissionId),
    documents = useAdmissionDocuments(admissionId),
    lifecycle = useAdmissionLifecycle(admissionId),
    finances = useAdmissionFinancialHistory(admissionId),
    enrollment = useEnrollmentReadiness(admissionId)
  const transition = useTransitionAdmission(),
    upload = useUploadAdmissionDocument(),
    replace = useReplaceAdmissionDocument(),
    verify = useVerifyAdmissionDocument(),
    withdraw = useWithdrawAdmissionDocument(),
    archiveApplicant = useArchiveApplicant()
  const router = useRouter()
  const canUpdate = useMockPermission("admissions.update")
  const data = detail.data
  const enrollmentHandler = resolveAdmissionEnrollmentHandler()
  const enroll = useMutation({
    mutationFn: ({ expectedVersion }: { expectedVersion: number }) => {
      if (!enrollmentHandler)
        throw new Error("no enrollment handler registered")
      return enrollmentHandler.enroll(admissionId, expectedVersion)
    },
    onSuccess: (student) => router.push(`/students/${student.studentId}`),
  })
  /**
   * Enrolling is not a status change. The API's status route rejects
   * `enrolled` outright — a student is created through intake and the
   * admission's status follows from that — so this hands that one target to
   * the registered handler and lets every other target take the normal route.
   */
  const transitionTo = (status: AdmissionStatus, reason?: string) => {
    if (!data) return
    if (status === "enrolled") {
      void enroll.mutate({ expectedVersion: data.version })
      return
    }
    transition.mutate({
      admissionId,
      toStatus: status,
      reason,
      expectedVersion: data.version,
    })
  }
  const onUpload = (document: AdmissionDocument, file: File) =>
    data &&
    upload.mutate({
      admissionId,
      requirementId: document.requirement.id,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
        blob: file,
      },
      idempotencyKey: `document-version-${Date.now()}`,
      expectedVersion: data.version,
    })
  const onReplace = (document: AdmissionDocument, file: File, reason: string) =>
    data &&
    replace.mutate({
      admissionId,
      documentId: document.id,
      requirementId: document.requirement.id,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
        blob: file,
      },
      reason,
      idempotencyKey: `document-replacement-${crypto.randomUUID()}`,
      expectedVersion: data.version,
    })
  const onVerify = (
    document: AdmissionDocument,
    decision: "verified" | "rejected",
    reason?: string
  ) =>
    data &&
    document.currentVersion &&
    verify.mutate({
      admissionId,
      documentId: document.id,
      versionId: document.currentVersion.id,
      decision,
      reason,
      expectedVersion: data.version,
    })
  const onWithdraw = (document: AdmissionDocument, reason: string) =>
    data &&
    document.currentVersion &&
    withdraw.mutate({
      admissionId,
      documentId: document.id,
      versionId: document.currentVersion.id,
      reason,
      expectedVersion: data.version,
    })
  return (
    <AdmissionsPage
      title="تفاصيل طلب القبول"
      description="ملف المتقدم والاختيار والمستندات والقرار في سجل واحد."
      actions={
        canUpdate && data?.status === "draft" ? (
          <Button
            nativeButton={false}
            render={<Link href={`/admissions/${admissionId}/edit`} />}
          >
            <Pencil aria-hidden />
            تعديل الطلب
          </Button>
        ) : undefined
      }
    >
      <AdmissionQueryState
        loading={detail.isLoading}
        error={detail.error}
        onRetry={() => void detail.refetch()}
      >
        {data && (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-heading text-2xl font-bold text-brand-navy dark:text-foreground">
                      {data.applicant.fullName}
                    </h2>
                    <AdmissionStatusBadge status={data.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <AdmissionBidiValue>{data.reference}</AdmissionBidiValue> ·{" "}
                    <AdmissionBidiValue>
                      {data.applicant.primaryPhone}
                    </AdmissionBidiValue>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.readiness.availableActions
                    // Enrolling needs Student Management's intake port. If
                    // nothing registered one, the action cannot be performed at
                    // all, so it is withheld rather than offered and then failing.
                    .filter(
                      (status) => status !== "enrolled" || enrollmentHandler
                    )
                    .map((status) => (
                      <AdmissionsPermission
                        key={status}
                        permission={
                          status === "submitted"
                            ? "admissions.submit"
                            : status === "under-review"
                              ? "admissions.review"
                              : status === "approved"
                                ? "admissions.approve"
                                : status === "rejected"
                                  ? "admissions.reject"
                                  : status === "archived"
                                    ? "admissions.archive"
                                    : "admissions.return"
                        }
                      >
                        <AdmissionTransitionDialog
                          label={admissionStatusLabels[status]}
                          reasonRequired={reasonRequired.has(status)}
                          destructive={
                            status === "rejected" || status === "archived"
                          }
                          pending={transition.isPending}
                          onConfirm={(reason) => transitionTo(status, reason)}
                        />
                      </AdmissionsPermission>
                    ))}
                </div>
              </div>
            </Card>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-6">
                <Card>
                  <h2 className="font-heading text-lg font-bold">
                    المعلومات التشغيلية
                  </h2>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        فرع التسجيل
                      </dt>
                      <dd>{data.assignment.registrationBranchLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        فرع الدراسة
                      </dt>
                      <dd>{data.assignment.studyBranchLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        موظف القبول
                      </dt>
                      <dd>{data.assignment.admissionsEmployeeName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">المؤهل</dt>
                      <dd>{data.applicant.qualificationLabel}</dd>
                    </div>
                  </dl>
                </Card>
                {data.selection && (
                  <Card className="space-y-4">
                    <h2 className="font-heading text-lg font-bold">
                      الاختيار الأكاديمي
                    </h2>
                    <p>
                      {data.selection.offeringLabel}{" "}
                      <AdmissionBidiValue>
                        {data.selection.offeringCode}
                      </AdmissionBidiValue>
                    </p>
                    {data.selection.batchLabel && (
                      <p>
                        {data.selection.batchLabel} ·{" "}
                        <AdmissionBidiValue>
                          {data.selection.batchCode}
                        </AdmissionBidiValue>
                      </p>
                    )}
                    {data.selection.eligibility && (
                      <AdmissionEligibilitySummary
                        assessment={data.selection.eligibility}
                      />
                    )}
                  </Card>
                )}
                {data.financial && (
                  <Card className="space-y-4">
                    <h2 className="font-heading text-lg font-bold">
                      التجهيز المالي
                    </h2>
                    <AdmissionFinancialSummary financial={data.financial} />
                    {finances.data && (
                      <AdmissionFinancialHistory revisions={finances.data} />
                    )}
                  </Card>
                )}
                <AdmissionsPermission permission="admissions.documents.view">
                  <Card>
                    <AdmissionDocumentState
                      loading={documents.isLoading}
                      error={documents.error}
                    >
                      {documents.data && (
                        <AdmissionDocumentsSection
                          documents={documents.data}
                          onUpload={onUpload}
                          onReplace={onReplace}
                          onVerify={onVerify}
                          onWithdraw={onWithdraw}
                        />
                      )}
                    </AdmissionDocumentState>
                  </Card>
                </AdmissionsPermission>
                {lifecycle.data && (
                  <Card>
                    <AdmissionLifecycleTimeline events={lifecycle.data} />
                  </Card>
                )}
              </div>
              <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                {/*
                  Readiness answers "could this record be submitted or approved
                  now". Once it is past both, the API answers `invalid-status` —
                  correctly, but the panel then reports a settled record as
                  needing review. It belongs to the stages the question applies to.
                */}
                {PENDING_DECISION.has(data.status) && (
                  <AdmissionReadinessPanel readiness={data.readiness} />
                )}
                <AdmissionApprovalSummary
                  snapshot={data.approvalSnapshot}
                  readiness={enrollment.data}
                />
                <AdmissionsPermission permission="admissions.archive">
                  {data.applicant.status !== "archived" && (
                    <ArchiveApplicantDialog
                      pending={archiveApplicant.isPending}
                      onConfirm={(reason) =>
                        archiveApplicant.mutate({
                          applicantId: data.applicant.id,
                          reason,
                          expectedVersion: data.applicant.version,
                        })
                      }
                    />
                  )}
                </AdmissionsPermission>
              </aside>
            </div>
          </div>
        )}
      </AdmissionQueryState>
    </AdmissionsPage>
  )
}
