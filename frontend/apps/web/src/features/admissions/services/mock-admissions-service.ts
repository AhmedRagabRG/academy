import type { AdmissionsService } from "./admissions-service"
import type {
  Admission,
  AdmissionDetail,
  AdmissionDocument,
  AdmissionSummary,
  Applicant,
  FinancialPreparationRevision,
} from "../types/domain"
import type {
  AcademicSelectionRevisionId,
  DocumentRequirementSnapshotId,
  AdmissionDocumentId,
  AdmissionId,
  ApplicantId,
  DocumentVersionId,
  FinancialPreparationRevisionId,
} from "../types/common"
import type {
  AcademicSelectionInput,
  AssignmentInput,
  DraftAdmissionInput,
  FinancialInput,
} from "../types/commands"
import {
  seededAdmissions,
  seededApplicants,
  makeEmptyDocuments,
} from "../data/admissions-fixtures"
import { admissionLookups } from "../data/admissions-lookups"
import {
  applyAdmissionScenario,
  admissionScenarios,
} from "./mock-scenario-controller"
import { AdmissionsError } from "./admissions-error"
import {
  defaultAdmissionContext,
  hasAdmissionPermission,
  isAdmissionInScope,
  redactSummary,
  type AdmissionServiceContext,
} from "../utils/admissions-scope"
import { duplicateApplicants } from "../utils/applicant-rules"
import { evaluateAdmissionSelection } from "./admission-eligibility-service"
import { calculateAdmissionMoney } from "../utils/admission-money"
import { getAdmissionReadiness } from "../utils/admission-readiness"
import { getTransitionPolicy } from "../utils/admission-lifecycle"
import {
  currentDocumentState,
  validateAdmissionFile,
} from "../utils/admission-documents"
import {
  buildApprovalSnapshot,
  buildEnrollmentReadiness,
} from "../utils/admission-snapshots"
import {
  normalizeAdmissionListQuery,
  normalizeAdmissionSearch,
} from "../utils/admission-list-query"

const applicants = structuredClone(seededApplicants)
const admissions = structuredClone(seededAdmissions)
let context: AdmissionServiceContext = defaultAdmissionContext

export function setAdmissionServiceContext(next: AdmissionServiceContext) {
  context = next
}

const clone = <T>(value: T): T => structuredClone(value)
const now = () => new Date().toISOString()
const actor = () => ({ id: context.employeeId, name: context.employeeName })
const lookupLabel = (
  items: { value: string; label: string }[],
  value: string
) => items.find((item) => item.value === value)?.label ?? value

async function prepare(signal?: AbortSignal) {
  await applyAdmissionScenario(signal)
  const scenario = admissionScenarios.get()
  if (scenario === "forbidden" || scenario === "scope-forbidden")
    throw new AdmissionsError(
      "forbidden",
      "permission",
      "غير مصرح بهذا الإجراء"
    )
  if (scenario === "unavailable")
    throw new AdmissionsError(
      "unavailable",
      "unavailable",
      "الخدمة غير متاحة مؤقتًا",
      true
    )
  if (scenario === "unexpected")
    throw new AdmissionsError(
      "unexpected",
      "unexpected",
      "حدث خطأ غير متوقع",
      true
    )
}

function requirePermission(permission: string) {
  if (!hasAdmissionPermission(context, permission))
    throw new AdmissionsError(
      "forbidden",
      "permission",
      "غير مصرح بهذا الإجراء"
    )
}

function getAdmissionRecord(id: AdmissionId) {
  const admission = admissions.find((item) => item.id === id)
  if (!admission || !isAdmissionInScope(admission, context))
    throw new AdmissionsError("not-found", "not-found", "طلب القبول غير موجود")
  return admission
}

function getApplicantRecord(id: ApplicantId) {
  const applicant = applicants.find((item) => item.id === id)
  if (!applicant || applicant.organizationId !== context.organizationId)
    throw new AdmissionsError("not-found", "not-found", "المتقدم غير موجود")
  return applicant
}

function checkVersion(record: { version: number }, expected: number) {
  if (admissionScenarios.get() === "stale" || record.version !== expected)
    throw new AdmissionsError(
      "stale-version",
      "conflict",
      "تم تعديل السجل بواسطة مستخدم آخر. حدّث الصفحة ثم راجع التغييرات.",
      false,
      undefined,
      record.version
    )
}

function resolveAssignment(input: AssignmentInput) {
  return {
    registrationBranchId: input.registrationBranchId,
    registrationBranchLabel: lookupLabel(
      admissionLookups.branches,
      input.registrationBranchId
    ),
    studyBranchId: input.studyBranchId,
    studyBranchLabel: lookupLabel(
      admissionLookups.branches,
      input.studyBranchId
    ),
    admissionsEmployeeId: input.admissionsEmployeeId,
    admissionsEmployeeName: lookupLabel(
      admissionLookups.employees,
      input.admissionsEmployeeId
    ),
    customerServiceEmployeeId: input.customerServiceEmployeeId,
    customerServiceEmployeeName: lookupLabel(
      admissionLookups.employees,
      input.customerServiceEmployeeId
    ),
    customerServiceManagerId: input.customerServiceManagerId,
    customerServiceManagerName: lookupLabel(
      admissionLookups.managers,
      input.customerServiceManagerId
    ),
    departmentId: input.departmentId,
    departmentLabel: lookupLabel(
      admissionLookups.departments,
      input.departmentId
    ),
    leadSourceId: input.leadSourceId,
    leadSourceLabel: lookupLabel(
      admissionLookups.leadSources,
      input.leadSourceId
    ),
    academicGradeId: input.academicGradeId,
    academicGradeLabel: input.academicGradeId
      ? lookupLabel(admissionLookups.academicGrades, input.academicGradeId)
      : undefined,
  }
}

async function makeSelection(
  input: AcademicSelectionInput,
  assignment: AssignmentInput,
  revisionNumber: number,
  reason?: string
) {
  const offering = admissionLookups.offerings.find(
    (item) => item.id === input.offeringId
  )
  if (!offering)
    throw new AdmissionsError(
      "offering-ineligible",
      "dependency",
      "المنتج الأكاديمي غير متاح"
    )
  const batch = admissionLookups.batches.find(
    (item) => item.id === input.batchId
  )
  const eligibility = await evaluateAdmissionSelection(input, assignment)
  return {
    id: `selection-${Date.now()}-${revisionNumber}` as AcademicSelectionRevisionId,
    revisionNumber,
    offeringKind: input.offeringKind,
    offeringId: input.offeringId,
    offeringVersion: offering.version,
    offeringLabel: offering.name.ar,
    offeringCode: offering.code,
    batchId: batch?.id,
    batchVersion: batch?.version,
    batchLabel: batch?.name,
    batchCode: batch?.code,
    batchFinancialRevisionId: batch?.financialRevisionId,
    eligibility,
    changeReason: reason,
    createdAt: now(),
    createdBy: context.employeeId,
  }
}

function makeFinancial(
  selection: Admission["selection"],
  input: FinancialInput,
  revisionNumber: number
): FinancialPreparationRevision {
  if (!selection)
    throw new AdmissionsError(
      "offering-ineligible",
      "dependency",
      "اختر المنتج الأكاديمي أولًا"
    )
  const offering = admissionLookups.offerings.find(
    (item) => item.id === selection.offeringId
  )
  const batch = admissionLookups.batches.find(
    (item) => item.id === selection.batchId
  )
  const source = batch ?? offering
  if (!source)
    throw new AdmissionsError(
      "inactive-dependency",
      "dependency",
      "مصدر السعر غير متاح"
    )
  try {
    const result = calculateAdmissionMoney({
      price: source.price,
      fees: source.registrationFees,
      mode: input.discountMode,
      value: input.discountMode === "none" ? "0" : input.discountValue,
    })
    return {
      id: `finance-${Date.now()}-${revisionNumber}` as FinancialPreparationRevisionId,
      revisionNumber,
      sourceKind: batch ? "program-batch" : "catalog-offering",
      sourceId: source.id,
      sourceVersion: source.version,
      sourceFinancialRevisionId:
        batch?.financialRevisionId ?? offering!.pricingRevisionId,
      productPrice: clone(source.price),
      registrationFees: clone(source.registrationFees),
      discountMode: input.discountMode,
      discountPercentage: result.discountPercentage,
      discountAmount: result.discountAmount,
      requiredAmount: result.requiredAmount,
      reason: input.reason,
      createdAt: now(),
      createdBy: context.employeeId,
    }
  } catch {
    throw new AdmissionsError(
      "financial-invalid",
      "validation",
      "القيم المالية غير صالحة"
    )
  }
}

function updateApplicant(
  applicant: Applicant,
  input: DraftAdmissionInput["applicant"]
) {
  Object.assign(applicant, {
    ...input,
    qualificationLabel: lookupLabel(
      admissionLookups.qualifications,
      input.qualificationId
    ),
    updatedAt: now(),
    updatedBy: context.employeeId,
    version: applicant.version + 1,
  })
}

function toSummary(admission: Admission): AdmissionSummary {
  const applicant = getApplicantRecord(admission.applicantId)
  return {
    id: admission.id,
    reference: admission.reference,
    applicantName: applicant.fullName,
    phoneHint: applicant.primaryPhone,
    offeringLabel: admission.selection?.offeringLabel ?? "لم يتم الاختيار",
    offeringCode: admission.selection?.offeringCode ?? "—",
    batchLabel: admission.selection?.batchLabel,
    batchCode: admission.selection?.batchCode,
    registrationBranch: admission.assignment.registrationBranchLabel,
    assignedEmployee: admission.assignment.admissionsEmployeeName,
    status: admission.status,
    updatedAt: admission.updatedAt,
    version: admission.version,
  }
}

function toDetail(admission: Admission): AdmissionDetail {
  return clone({
    ...admission,
    applicant: getApplicantRecord(admission.applicantId),
    readiness: getAdmissionReadiness(
      admission,
      admission.status === "under-review" ? "approve" : "submit"
    ),
  })
}

function bump(admission: Admission) {
  admission.version += 1
  admission.updatedAt = now()
  admission.updatedBy = context.employeeId
}

export const admissionsService: AdmissionsService = {
  async list(rawQuery, signal) {
    requirePermission("admissions.view")
    await prepare(signal)
    const query = normalizeAdmissionListQuery(rawQuery)
    if (admissionScenarios.get() === "empty")
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: query.pageSize,
        totalPages: 1,
      }
    const search = normalizeAdmissionSearch(query.search)
    let rows = admissions
      .filter((item) => isAdmissionInScope(item, context))
      .map(toSummary)
    if (search)
      rows = rows.filter((item) =>
        normalizeAdmissionSearch(
          [
            item.applicantName,
            item.reference,
            item.offeringCode,
            item.batchCode,
          ]
            .filter(Boolean)
            .join(" ")
        ).includes(search)
      )
    if (query.branchId)
      rows = rows.filter(
        (item) =>
          item.registrationBranch ===
          lookupLabel(admissionLookups.branches, query.branchId!)
      )
    if (query.offeringId)
      rows = rows.filter(
        (item) =>
          admissions.find((a) => a.id === item.id)?.selection?.offeringId ===
          query.offeringId
      )
    if (query.batchId)
      rows = rows.filter(
        (item) =>
          admissions.find((a) => a.id === item.id)?.selection?.batchId ===
          query.batchId
      )
    if (query.status && query.status !== "all")
      rows = rows.filter((item) => item.status === query.status)
    if (query.admissionsEmployeeId)
      rows = rows.filter(
        (item) =>
          admissions.find((a) => a.id === item.id)?.assignment
            .admissionsEmployeeId === query.admissionsEmployeeId
      )
    const sort = query.sort ?? "updatedAt"
    rows.sort((a, b) => {
      const left =
        sort === "applicantName"
          ? a.applicantName
          : sort === "reference"
            ? a.reference
            : sort === "status"
              ? a.status
              : a.updatedAt
      const right =
        sort === "applicantName"
          ? b.applicantName
          : sort === "reference"
            ? b.reference
            : sort === "status"
              ? b.status
              : b.updatedAt
      const result = left.localeCompare(right, "ar") || a.id.localeCompare(b.id)
      return query.direction === "asc" ? result : -result
    })
    const total = rows.length
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
    const page = Math.min(query.page, totalPages)
    const start = (page - 1) * query.pageSize
    return {
      items: rows.slice(start, start + query.pageSize).map(redactSummary),
      total,
      page,
      pageSize: query.pageSize,
      totalPages,
    }
  },
  async exportList(rawQuery, signal) {
    requirePermission("admissions.export")
    const page = await admissionsService.list(
      { ...rawQuery, page: 1, pageSize: 100 },
      signal
    )
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`
    return [
      "reference,applicant,offering,status",
      ...page.items.map((item) =>
        [item.reference, item.applicantName, item.offeringLabel, item.status]
          .map(escape)
          .join(",")
      ),
    ].join("\n")
  },
  async bulkTransition(command) {
    const settled = await Promise.allSettled(
      command.items.map((item) => admissionsService.transition(item))
    )
    return settled.map((result, index) => ({
      admissionId: command.items[index]!.admissionId,
      success: result.status === "fulfilled",
      message: result.status === "rejected" ? "تعذر تنفيذ الإجراء" : undefined,
    }))
  },
  async get(id, signal) {
    requirePermission("admissions.view")
    await prepare(signal)
    return toDetail(getAdmissionRecord(id))
  },
  async lookups(signal) {
    await prepare(signal)
    return clone(admissionLookups)
  },
  async findDuplicates(input, signal) {
    await prepare(signal)
    return duplicateApplicants(input, applicants).map(
      ({ applicant, reasons }) => ({
        applicantId: applicant.id,
        label: `${applicant.fullName} · ${applicant.primaryPhone.slice(-4).padStart(applicant.primaryPhone.length, "•")}`,
        reasons,
      })
    )
  },
  async create(command) {
    requirePermission("admissions.create")
    await prepare()
    const duplicates = duplicateApplicants(command.input.applicant, applicants)
    if (duplicates.length && !command.duplicateResolution)
      throw new AdmissionsError(
        "duplicate-resolution-required",
        "conflict",
        "يوجد متقدم محتمل مطابق"
      )
    let applicant: Applicant
    if (
      command.duplicateResolution?.outcome === "use-existing" &&
      command.duplicateResolution.applicantId
    )
      applicant = getApplicantRecord(command.duplicateResolution.applicantId)
    else {
      if (duplicates.length && !command.duplicateResolution?.reason)
        throw new AdmissionsError(
          "duplicate-resolution-required",
          "validation",
          "سبب إنشاء الاستثناء مطلوب"
        )
      const timestamp = Date.now()
      applicant = {
        id: `applicant-${timestamp}` as ApplicantId,
        organizationId: context.organizationId,
        ...command.input.applicant,
        qualificationLabel: lookupLabel(
          admissionLookups.qualifications,
          command.input.applicant.qualificationId
        ),
        status: "active",
        createdAt: now(),
        createdBy: context.employeeId,
        updatedAt: now(),
        updatedBy: context.employeeId,
        version: 1,
      }
      applicants.push(applicant)
    }
    const timestamp = Date.now()
    const admission: Admission = {
      id: `admission-${timestamp}` as AdmissionId,
      reference: `ADM-2026-${String(admissions.length + 1).padStart(4, "0")}`,
      organizationId: context.organizationId,
      applicantId: applicant.id,
      status: "draft",
      assignment: resolveAssignment(command.input.assignment),
      requirementSnapshot: clone(admissionLookups.documentPolicy),
      documents: makeEmptyDocuments(),
      notes: command.input.notes,
      lifecycle: [
        {
          id: `event-${timestamp}`,
          fromStatus: null,
          toStatus: "draft",
          actor: actor(),
          occurredAt: now(),
          sourceVersion: 0,
          resultVersion: 1,
        },
      ],
      financialHistory: [],
      selectionHistory: [],
      createdAt: now(),
      createdBy: context.employeeId,
      updatedAt: now(),
      updatedBy: context.employeeId,
      version: 1,
    }
    if (command.input.selection) {
      admission.selection = await makeSelection(
        command.input.selection,
        command.input.assignment,
        1
      )
      admission.selectionHistory.push(admission.selection)
    }
    if (command.input.financial) {
      admission.financial = makeFinancial(
        admission.selection,
        command.input.financial,
        1
      )
      admission.financialHistory.push(admission.financial)
    }
    admissions.push(admission)
    return toDetail(admission)
  },
  async update(command) {
    requirePermission("admissions.update")
    await prepare()
    const admission = getAdmissionRecord(command.admissionId)
    checkVersion(admission, command.expectedVersion)
    if (admission.status !== "draft")
      throw new AdmissionsError(
        "invalid-state",
        "conflict",
        "يجب إعادة الطلب إلى المسودة قبل التعديل"
      )
    const applicant = getApplicantRecord(admission.applicantId)
    updateApplicant(applicant, command.input.applicant)
    admission.assignment = resolveAssignment(command.input.assignment)
    admission.notes = command.input.notes
    bump(admission)
    return toDetail(admission)
  },
  async archiveApplicant(command) {
    requirePermission("admissions.archive")
    await prepare()
    if (!command.reason.trim())
      throw new AdmissionsError("validation", "validation", "سبب الأرشفة مطلوب")
    const applicant = getApplicantRecord(command.applicantId)
    checkVersion(applicant, command.expectedVersion)
    applicant.status = "archived"
    applicant.version += 1
    applicant.updatedAt = now()
    applicant.updatedBy = context.employeeId
    return clone(applicant)
  },
  async changeSelection(command) {
    requirePermission("admissions.academic.manage")
    await prepare()
    const admission = getAdmissionRecord(command.admissionId)
    checkVersion(admission, command.expectedVersion)
    if (admission.status !== "draft")
      throw new AdmissionsError(
        "invalid-state",
        "conflict",
        "الاختيار الأكاديمي قابل للتعديل في المسودة فقط"
      )
    if (admission.selection && command.confirmedConsequences.length === 0)
      throw new AdmissionsError(
        "confirmation-required",
        "validation",
        "يجب تأكيد آثار تغيير الاختيار"
      )
    const input: AssignmentInput = {
      registrationBranchId: admission.assignment.registrationBranchId,
      studyBranchId: admission.assignment.studyBranchId,
      admissionsEmployeeId: admission.assignment.admissionsEmployeeId,
      customerServiceEmployeeId: admission.assignment.customerServiceEmployeeId,
      customerServiceManagerId: admission.assignment.customerServiceManagerId,
      departmentId: admission.assignment.departmentId,
      leadSourceId: admission.assignment.leadSourceId,
      academicGradeId: admission.assignment.academicGradeId,
    }
    admission.selection = await makeSelection(
      command.selection,
      input,
      admission.selectionHistory.length + 1,
      command.reason
    )
    admission.selectionHistory.push(admission.selection)
    admission.financial = undefined
    admission.documents = makeEmptyDocuments()
    bump(admission)
    return toDetail(admission)
  },
  async prepareFinancials(command) {
    requirePermission("admissions.finance.manage")
    await prepare()
    const admission = getAdmissionRecord(command.admissionId)
    checkVersion(admission, command.expectedVersion)
    admission.financial = makeFinancial(
      admission.selection,
      command.input,
      admission.financialHistory.length + 1
    )
    admission.financialHistory.push(admission.financial)
    bump(admission)
    return toDetail(admission)
  },
  async documents(id, signal) {
    requirePermission("admissions.documents.view")
    await prepare(signal)
    return clone(getAdmissionRecord(id).documents)
  },
  async refreshDocumentPolicy(id) {
    requirePermission("admissions.documents.manage")
    await prepare()
    const admission = getAdmissionRecord(id)
    const existing = new Map(
      admission.documents.map((document) => [
        document.requirement.key,
        document,
      ])
    )
    admission.requirementSnapshot = {
      ...clone(admissionLookups.documentPolicy),
      id: `requirement-snapshot-${crypto.randomUUID()}` as DocumentRequirementSnapshotId,
      createdAt: now(),
      selectionRevisionId: admission.selection?.id,
    }
    admission.documents = admission.requirementSnapshot.requirements.map(
      (requirement) =>
        existing.get(requirement.key) ?? {
          id: `document-${crypto.randomUUID()}` as AdmissionDocumentId,
          requirement: clone(requirement),
          state: "missing",
          versions: [],
          decisions: [],
        }
    )
    bump(admission)
    return clone(admission.documents)
  },
  async uploadDocument(command) {
    requirePermission("admissions.documents.manage")
    await prepare()
    if (admissionScenarios.get() === "upload-interrupted")
      throw new AdmissionsError(
        "upload-interrupted",
        "upload",
        "تعذر رفع الملف. حاول مرة أخرى.",
        true
      )
    const admission = getAdmissionRecord(command.admissionId)
    checkVersion(admission, command.expectedVersion)
    const document = admission.documents.find(
      (item) => item.requirement.id === command.requirementId
    )
    if (!document)
      throw new AdmissionsError(
        "not-found",
        "not-found",
        "متطلب المستند غير موجود"
      )
    const fileError = validateAdmissionFile(command.file, document.requirement)
    if (fileError)
      throw new AdmissionsError(
        fileError,
        "validation",
        "الملف لا يطابق متطلبات الرفع"
      )
    const existing = document.versions.find(
      (version) => version.id === command.idempotencyKey
    )
    if (existing) return clone(document)
    const version = {
      id: command.idempotencyKey as DocumentVersionId,
      versionNumber: document.versions.length + 1,
      fileName: command.file.name,
      mimeType: command.file.type,
      size: command.file.size,
      previewUrl: command.file.previewUrl,
      status: "available" as const,
      uploadedAt: now(),
      uploadedBy: context.employeeId,
    }
    document.versions.push(version)
    document.currentVersion = version
    document.state = "pending"
    bump(admission)
    return clone(document)
  },
  async replaceDocument(command) {
    const document = await this.uploadDocument(command)
    return document
  },
  async withdrawDocument(command) {
    requirePermission("admissions.documents.manage")
    await prepare()
    if (!command.reason.trim())
      throw new AdmissionsError("validation", "validation", "سبب السحب مطلوب")
    const admission = getAdmissionRecord(command.admissionId)
    checkVersion(admission, command.expectedVersion)
    const document = admission.documents.find(
      (item) => item.id === command.documentId
    )
    const version = document?.versions.find(
      (item) => item.id === command.versionId
    )
    if (!document || !version)
      throw new AdmissionsError("not-found", "not-found", "المستند غير موجود")
    version.status = "withdrawn"
    document.state = currentDocumentState(document)
    bump(admission)
    return clone(document)
  },
  async verifyDocument(command) {
    requirePermission("admissions.documents.verify")
    await prepare()
    if (command.decision === "rejected" && !command.reason?.trim())
      throw new AdmissionsError(
        "validation",
        "validation",
        "سبب رفض المستند مطلوب"
      )
    const admission = getAdmissionRecord(command.admissionId)
    checkVersion(admission, command.expectedVersion)
    const document = admission.documents.find(
      (item) => item.id === command.documentId
    )
    if (
      !document?.currentVersion ||
      document.currentVersion.id !== command.versionId
    )
      throw new AdmissionsError(
        "document-version-stale",
        "conflict",
        "تم استبدال هذا المستند"
      )
    document.decisions.push({
      id: `decision-${Date.now()}`,
      documentVersionId: command.versionId,
      decision: command.decision,
      reason: command.reason,
      reviewer: actor(),
      decidedAt: now(),
    })
    document.state = command.decision
    bump(admission)
    return clone(document)
  },
  async documentHistory(admissionId, documentId, signal) {
    requirePermission("admissions.documents.view")
    await prepare(signal)
    return clone(
      getAdmissionRecord(admissionId).documents.find(
        (item) => item.id === documentId
      )?.versions ?? []
    )
  },
  async transition(command) {
    await prepare()
    const admission = getAdmissionRecord(command.admissionId)
    checkVersion(admission, command.expectedVersion)
    const policy = getTransitionPolicy(admission.status, command.toStatus)
    if (!policy)
      throw new AdmissionsError(
        "invalid-transition",
        "conflict",
        "انتقال الحالة غير مسموح"
      )
    requirePermission(policy.permission)
    if (policy.reasonRequired && !command.reason?.trim())
      throw new AdmissionsError("validation", "validation", "سبب الإجراء مطلوب")
    const action =
      command.toStatus === "approved"
        ? "approve"
        : command.toStatus === "submitted"
          ? "submit"
          : undefined
    if (action) {
      if (admission.selection) {
        const assignment: AssignmentInput = {
          registrationBranchId: admission.assignment.registrationBranchId,
          studyBranchId: admission.assignment.studyBranchId,
          admissionsEmployeeId: admission.assignment.admissionsEmployeeId,
          customerServiceEmployeeId:
            admission.assignment.customerServiceEmployeeId,
          customerServiceManagerId:
            admission.assignment.customerServiceManagerId,
          departmentId: admission.assignment.departmentId,
          leadSourceId: admission.assignment.leadSourceId,
          academicGradeId: admission.assignment.academicGradeId,
        }
        admission.selection.eligibility = await evaluateAdmissionSelection(
          {
            offeringKind: admission.selection.offeringKind,
            offeringId: admission.selection.offeringId,
            batchId: admission.selection.batchId,
          },
          assignment,
          action === "approve" ? "approval" : "submission"
        )
      }
      const readiness = getAdmissionReadiness(admission, action)
      if (!readiness.ready)
        throw new AdmissionsError(
          "readiness-incomplete",
          "validation",
          "متطلبات الإجراء غير مكتملة"
        )
    }
    const sourceVersion = admission.version
    const fromStatus = admission.status
    if (command.toStatus === "approved")
      admission.approvalSnapshot = buildApprovalSnapshot(
        admission,
        getApplicantRecord(admission.applicantId),
        actor(),
        now()
      )
    admission.status = command.toStatus
    admission.activeReviewer =
      command.toStatus === "under-review" ? actor() : undefined
    bump(admission)
    admission.lifecycle.push({
      id: `event-${Date.now()}`,
      fromStatus,
      toStatus: command.toStatus,
      reason: command.reason,
      actor: actor(),
      occurredAt: now(),
      sourceVersion,
      resultVersion: admission.version,
    })
    return toDetail(admission)
  },
  async readiness(id, action, signal) {
    await prepare(signal)
    return clone(getAdmissionReadiness(getAdmissionRecord(id), action))
  },
  async lifecycle(id, signal) {
    await prepare(signal)
    return clone(getAdmissionRecord(id).lifecycle)
  },
  async financialHistory(id, signal) {
    requirePermission("admissions.finance.view")
    await prepare(signal)
    return clone(getAdmissionRecord(id).financialHistory)
  },
  async enrollmentReadiness(id, signal) {
    requirePermission("admissions.enrollment-readiness")
    await prepare(signal)
    const admission = getAdmissionRecord(id)
    return clone(
      buildEnrollmentReadiness(
        admission,
        getApplicantRecord(admission.applicantId)
      )
    )
  },
}

export type { AdmissionServiceContext }
export type { AdmissionId, AdmissionDocumentId }
