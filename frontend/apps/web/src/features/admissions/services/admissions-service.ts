import type {
  Paginated,
  AdmissionDocumentId,
  AdmissionId,
  ApplicantId,
} from "../types/common"
import type {
  AdmissionDetail,
  AdmissionDocument,
  AdmissionLifecycleEvent,
  AdmissionLookups,
  AdmissionReadiness,
  AdmissionSummary,
  Applicant,
  DocumentVersion,
  EnrollmentReadinessSummary,
  FinancialPreparationRevision,
} from "../types/domain"
import type {
  AdmissionListQuery,
  BulkTransitionCommand,
  BulkTransitionOutcome,
  ArchiveApplicantCommand,
  ChangeSelectionCommand,
  CreateDraftCommand,
  PrepareFinancialsCommand,
  ReplaceDocumentCommand,
  TransitionAdmissionCommand,
  UpdateDraftCommand,
  UploadDocumentCommand,
  VerifyDocumentCommand,
  WithdrawDocumentCommand,
} from "../types/commands"

export interface AdmissionsService {
  list(
    query: AdmissionListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<AdmissionSummary>>
  exportList(query: AdmissionListQuery, signal?: AbortSignal): Promise<string>
  bulkTransition(
    command: BulkTransitionCommand
  ): Promise<BulkTransitionOutcome[]>
  get(id: AdmissionId, signal?: AbortSignal): Promise<AdmissionDetail>
  lookups(signal?: AbortSignal): Promise<AdmissionLookups>
  findDuplicates(
    input: CreateDraftCommand["input"]["applicant"],
    signal?: AbortSignal
  ): Promise<{ applicantId: ApplicantId; label: string; reasons: string[] }[]>
  create(command: CreateDraftCommand): Promise<AdmissionDetail>
  update(command: UpdateDraftCommand): Promise<AdmissionDetail>
  archiveApplicant(command: ArchiveApplicantCommand): Promise<Applicant>
  changeSelection(command: ChangeSelectionCommand): Promise<AdmissionDetail>
  prepareFinancials(command: PrepareFinancialsCommand): Promise<AdmissionDetail>
  documents(id: AdmissionId, signal?: AbortSignal): Promise<AdmissionDocument[]>
  refreshDocumentPolicy(id: AdmissionId): Promise<AdmissionDocument[]>
  uploadDocument(command: UploadDocumentCommand): Promise<AdmissionDocument>
  replaceDocument(command: ReplaceDocumentCommand): Promise<AdmissionDocument>
  withdrawDocument(command: WithdrawDocumentCommand): Promise<AdmissionDocument>
  verifyDocument(command: VerifyDocumentCommand): Promise<AdmissionDocument>
  documentHistory(
    admissionId: AdmissionId,
    documentId: AdmissionDocumentId,
    signal?: AbortSignal
  ): Promise<DocumentVersion[]>
  transition(command: TransitionAdmissionCommand): Promise<AdmissionDetail>
  readiness(
    id: AdmissionId,
    action: "submit" | "approve",
    signal?: AbortSignal
  ): Promise<AdmissionReadiness>
  lifecycle(
    id: AdmissionId,
    signal?: AbortSignal
  ): Promise<AdmissionLifecycleEvent[]>
  financialHistory(
    id: AdmissionId,
    signal?: AbortSignal
  ): Promise<FinancialPreparationRevision[]>
  enrollmentReadiness(
    id: AdmissionId,
    signal?: AbortSignal
  ): Promise<EnrollmentReadinessSummary>
}
