import type {
  ActorRef,
  Cursor,
  Paginated,
  StudentDocumentId,
  StudentDocumentVersionId,
  StudentEnrollmentId,
  StudentId,
  StudentNoteId,
  StudentStatusChangeId,
  StudentTimelineEventId,
  TimelineCategory,
} from "../types/common"
import type {
  Student,
  StudentDocument,
  StudentDocumentVersion,
  StudentEnrollment,
  StudentFinancialSummaryResult,
  StudentLookups,
  StudentNote,
  StudentStatusChange,
  StudentTimelineEvent,
} from "../types/domain"
import type {
  BulkStatusOutcome,
  EnrollmentIntakeInput,
  StudentContextSummary,
  StudentDetail,
  StudentRef,
  StudentSummary,
} from "../types/projections"
import type {
  AddNoteCommand,
  ArchiveDocumentCommand,
  ArchiveNoteCommand,
  BulkChangeStatusCommand,
  ChangeStatusCommand,
  EditNoteCommand,
  ReplaceDocumentCommand,
  StudentListQuery,
  UpdateProfileCommand,
  UploadDocumentCommand,
} from "../types/commands"
import type { StudentsService } from "./students-service"
import { StudentsError } from "./students-error"
import { studentsPermissions } from "../config/students-permissions"
import { createStudentStore, type StudentStore } from "../data/students-fixtures"
import { studentLookupFixtures } from "../data/students-lookups"
import { buildScaleStudents } from "../data/students-scale-fixtures"
import {
  hasStudentPermission,
  isStudentInScope,
  redactSummary,
  type StudentServiceContext,
} from "../utils/students-scope"
import {
  availableStatusActions,
  evaluateTransition,
  isReadOnlyStatus,
} from "../utils/student-lifecycle"
import {
  documentCompletion,
  findByUploadAttempt,
  isArchived,
  nextVersionNumber,
  sortDocuments,
  validateFileAgainstType,
  versionHistory,
  withNewVersion,
} from "../utils/student-documents"
import {
  batchRuleViolation,
  primaryEnrollment,
  sortEnrollments,
} from "../utils/enrollment-rules"
import { nextSequence, pageTimeline } from "../utils/student-timeline"
import {
  clampPage,
  normalizeStudentListQuery,
} from "../utils/student-list-query"
import {
  normalizeNationalId,
  normalizePhone,
  normalizeSearchTerm,
} from "../utils/student-identity-rules"
import {
  allocateStudentCode,
  defaultStudentCodePattern,
  intakeIdempotencyKey,
} from "../utils/student-intake-rules"
import {
  scenarioContext,
  scenarioDelay,
  scenarioFinanceReader,
  shouldFail,
  studentScenarios,
} from "./mock-scenario-controller"

let store: StudentStore = createStudentStore()
let scaleLoaded = false
let idCounter = 0

const nextId = (prefix: string) => `${prefix}-${(idCounter += 1)}-${Date.now()}`

/**
 * Per-student indexes. Without them, filtering scans the whole enrollment and
 * document arrays once per student, which is O(n²) and blows the SC-004 budget at
 * 20,000 records. Any write invalidates them.
 */
let enrollmentIndex: Map<string, StudentEnrollment[]> | null = null
let documentIndex: Map<string, StudentDocument[]> | null = null
let timelineIndex: Map<string, StudentTimelineEvent[]> | null = null

function invalidateIndexes(): void {
  enrollmentIndex = null
  documentIndex = null
  timelineIndex = null
}

function groupBy<T extends { studentId: StudentId }>(
  rows: readonly T[]
): Map<string, T[]> {
  const index = new Map<string, T[]>()
  for (const row of rows) {
    const bucket = index.get(row.studentId)
    if (bucket) bucket.push(row)
    else index.set(row.studentId, [row])
  }
  return index
}

/** Rebuilds the deterministic store; used by tests between cases. */
export function resetStudentStore(): void {
  store = createStudentStore()
  scaleLoaded = false
  idCounter = 0
  invalidateIndexes()
  studentScenarios.reset()
}

function ensureScale(): void {
  const scenario = studentScenarios.read()
  if (!scenario.scale || scaleLoaded) return
  const { students, enrollments } = buildScaleStudents(scenario.scaleSize)
  store.students.push(...students)
  store.enrollments.push(...enrollments)
  for (const student of students)
    store.intakeIndex.set(student.system.approvalSnapshotId, student.id)
  scaleLoaded = true
  invalidateIndexes()
}

const clone = <T>(value: T): T => structuredClone(value)

function contextActor(context: StudentServiceContext): ActorRef {
  return { id: context.employeeId, name: context.employeeName, active: true }
}

function require(context: StudentServiceContext, permission: string): void {
  if (!hasStudentPermission(context, permission))
    throw new StudentsError("forbidden")
}

function findStudent(
  studentId: StudentId,
  context: StudentServiceContext
): Student {
  const student = store.students.find((item) => item.id === studentId)
  if (!student) throw new StudentsError("not-found")
  if (student.organizationId !== context.organizationId)
    throw new StudentsError("not-found")
  if (!isStudentInScope(student, context))
    throw new StudentsError("out-of-scope")
  return student
}

function assertVersion(student: Student, expectedVersion: number): void {
  if (studentScenarios.read().forceConflict)
    throw new StudentsError("version-conflict", {
      currentVersion: student.version,
    })
  if (student.version !== expectedVersion)
    throw new StudentsError("version-conflict", {
      currentVersion: student.version,
    })
}

function assertWritable(student: Student): void {
  if (isReadOnlyStatus(student.status))
    throw new StudentsError("archived-read-only")
}

function touch(student: Student, context: StudentServiceContext): void {
  student.version += 1
  student.updatedAt = new Date().toISOString()
  student.updatedBy = contextActor(context)
}

/**
 * Appends exactly one timeline event. Every caller is inside a command that has
 * already succeeded, so a failed command can never leave an event (spec FR-023).
 */
function appendEvent(
  studentId: StudentId,
  category: TimelineCategory,
  summary: string,
  context: StudentServiceContext,
  subjectRef?: string,
  origin: StudentTimelineEvent["origin"] = "students",
  occurredAt = new Date().toISOString()
): void {
  store.timeline.push({
    id: nextId("timeline") as StudentTimelineEventId,
    studentId,
    category,
    occurredAt,
    sequence: nextSequence(timelineOf(studentId)),
    actor: contextActor(context),
    origin,
    subjectRef,
    summary,
  })
  timelineIndex = null
}

function enrollmentsOf(studentId: StudentId): StudentEnrollment[] {
  enrollmentIndex ??= groupBy(store.enrollments)
  return enrollmentIndex.get(studentId) ?? []
}

function documentsOf(studentId: StudentId): StudentDocument[] {
  documentIndex ??= groupBy(store.documents)
  return documentIndex.get(studentId) ?? []
}

function timelineOf(studentId: StudentId): StudentTimelineEvent[] {
  timelineIndex ??= groupBy(store.timeline)
  return timelineIndex.get(studentId) ?? []
}

function toSummary(student: Student): StudentSummary {
  const enrollments = enrollmentsOf(student.id)
  const primary = primaryEnrollment(enrollments)
  return {
    id: student.id,
    studentCode: student.studentCode,
    fullName: student.identity.fullName,
    phoneHint: student.identity.primaryPhone,
    registrationBranchLabel: student.assignment.registrationBranchLabel,
    studyBranchLabel: student.assignment.studyBranchLabel,
    departmentLabel: student.assignment.departmentLabel,
    primaryOfferingLabel: primary?.offeringLabel ?? "—",
    primaryBatchLabel: primary?.batchLabel,
    customerServiceEmployeeName:
      student.assignment.customerServiceEmployeeName,
    status: student.status,
    enrollmentCount: enrollments.length,
    updatedAt: student.updatedAt,
    version: student.version,
  }
}

function matchesSearch(student: Student, term: string): boolean {
  const haystack = [
    normalizeSearchTerm(student.identity.fullName),
    student.studentCode.toLowerCase(),
    normalizePhone(student.identity.primaryPhone),
    student.identity.guardianPhone
      ? normalizePhone(student.identity.guardianPhone)
      : "",
    student.identity.nationalId
      ? normalizeNationalId(student.identity.nationalId)
      : "",
  ]
  return haystack.some((value) => value.includes(term))
}

function matchesFilters(student: Student, query: StudentListQuery): boolean {
  if (
    query.branchIds &&
    !query.branchIds.includes(student.assignment.registrationBranchId) &&
    !query.branchIds.includes(student.assignment.studyBranchId)
  )
    return false
  if (
    query.departmentIds &&
    !query.departmentIds.includes(student.assignment.departmentId)
  )
    return false
  if (query.statuses && !query.statuses.includes(student.status)) return false
  if (
    query.customerServiceEmployeeIds &&
    !query.customerServiceEmployeeIds.includes(
      student.assignment.customerServiceEmployeeId
    )
  )
    return false
  // Only touch enrollments when an academic filter is actually set.
  if (query.offeringIds || query.batchIds) {
    const enrollments = enrollmentsOf(student.id)
    if (
      query.offeringIds &&
      !enrollments.some((item) => query.offeringIds?.includes(item.offeringId))
    )
      return false
    if (
      query.batchIds &&
      !enrollments.some(
        (item) => item.batchId && query.batchIds?.includes(item.batchId)
      )
    )
      return false
  }
  return true
}

function sortStudents(
  students: Student[],
  sort: StudentListQuery["sort"]
): Student[] {
  const direction = sort?.direction === "asc" ? 1 : -1
  const field = sort?.field ?? "updatedAt"
  return [...students].sort((left, right) => {
    const compare = (() => {
      switch (field) {
        case "fullName":
          return left.identity.fullName.localeCompare(
            right.identity.fullName,
            "ar"
          )
        case "studentCode":
          return left.studentCode.localeCompare(right.studentCode)
        case "enrollmentDate":
          return left.system.enrollmentDate.localeCompare(
            right.system.enrollmentDate
          )
        case "status":
          return left.status.localeCompare(right.status)
        case "updatedAt":
        default:
          return left.updatedAt.localeCompare(right.updatedAt)
      }
    })()
    return compare * direction
  })
}

function areaPermissions(context: StudentServiceContext) {
  const can = (permission: string) => hasStudentPermission(context, permission)
  return {
    overview: can(studentsPermissions.view),
    enrollments: can(studentsPermissions.enrollmentsView),
    documents: can(studentsPermissions.documentsView),
    documentsManage: can(studentsPermissions.documentsManage),
    notes: can(studentsPermissions.notesView),
    notesManage: can(studentsPermissions.notesManage),
    timeline: can(studentsPermissions.timelineView),
    financial: can(studentsPermissions.financeView),
    update: can(studentsPermissions.update),
    archive: can(studentsPermissions.archive),
    activate: can(studentsPermissions.activate),
    statusManage: can(studentsPermissions.statusManage),
    statusCorrect: can(studentsPermissions.statusCorrect),
    export: can(studentsPermissions.export),
  }
}

function toDetail(
  student: Student,
  context: StudentServiceContext
): StudentDetail {
  const permissions = areaPermissions(context)
  return {
    ...clone(student),
    enrollments: permissions.enrollments
      ? clone(sortEnrollments(enrollmentsOf(student.id)))
      : [],
    documentCompletion: documentCompletion(documentsOf(student.id)),
    availableStatusActions: availableStatusActions(
      student.status,
      context.permissions
    ),
    permissions,
  }
}

async function guard(
  area: "list" | "detail" | "documents" | "notes" | "timeline"
): Promise<void> {
  await scenarioDelay()
  if (shouldFail(area)) throw new StudentsError("service-unavailable")
}

/**
 * Materializes a student from an approved admission. Exported for the intake port
 * only — there is no interactive path to it (spec FR-001, FR-002).
 */
export function materializeFromAdmission(
  input: EnrollmentIntakeInput,
  context: StudentServiceContext,
  admissionFacts?: { submittedAt?: string; approvedAt?: string }
): StudentRef {
  ensureScale()
  const idempotencyKey = intakeIdempotencyKey(input)

  const existingId = store.intakeIndex.get(idempotencyKey)
  if (existingId) {
    const existing = store.students.find((item) => item.id === existingId)
    if (existing)
      return { studentId: existing.id, studentCode: existing.studentCode }
  }

  const violation = batchRuleViolation({
    kind: input.academicTarget.kind,
    batchId: input.academicTarget.batchId,
  })
  if (violation)
    throw new StudentsError("enrollment-batch-rule-violated", {
      reasons: [violation],
    })

  const lookups = studentLookupFixtures()
  const offering = lookups.offeringCatalog.find(
    (item) => item.id === input.academicTarget.offeringId
  )
  const batch = input.academicTarget.batchId
    ? lookups.batchCatalog.find(
        (item) => item.id === input.academicTarget.batchId
      )
    : undefined
  const branchLabel = (id: string) =>
    lookups.branches.find((item) => item.value === id)?.label ?? id

  // A second approved admission for the same applicant extends the existing student.
  const sameApplicant = store.students.find(
    (item) => item.identity.primaryPhone === input.applicant.phone
  )
  const now = new Date().toISOString()

  const enrollment: StudentEnrollment = {
    id: nextId("enrollment") as StudentEnrollmentId,
    studentId: (sameApplicant?.id ?? "") as StudentId,
    offeringKind: input.academicTarget.kind,
    offeringId: input.academicTarget.offeringId,
    offeringVersionAtEnrollment: input.academicTarget.offeringVersion,
    offeringLabel: offering?.label ?? input.academicTarget.offeringId,
    offeringCode: offering?.code ?? "—",
    batchId: batch?.id,
    batchVersionAtEnrollment: batch?.version,
    batchLabel: batch?.label,
    batchCode: batch?.code,
    registrationBranchLabel: branchLabel(input.branches.registrationBranchId),
    studyBranchLabel: branchLabel(input.branches.studyBranchId),
    enrollmentDate: now,
    status: "active",
    sourceAdmissionId: input.admissionId,
  }

  if (sameApplicant) {
    store.enrollments.push(enrollment)
    enrollmentIndex = null
    store.intakeIndex.set(idempotencyKey, sameApplicant.id)
    appendEvent(
      sameApplicant.id,
      "enrollment-added",
      `تمت إضافة تسجيل في ${enrollment.offeringLabel}`,
      context,
      enrollment.id
    )
    return {
      studentId: sameApplicant.id,
      studentCode: sameApplicant.studentCode,
    }
  }

  const takenCodes = new Set(store.students.map((item) => item.studentCode))
  const studentCode = allocateStudentCode(
    defaultStudentCodePattern,
    takenCodes,
    takenCodes.size + 1
  )
  if (takenCodes.has(studentCode))
    throw new StudentsError("duplicate-student-code")

  const studentId = `student-${studentCode}` as StudentId
  const actor = contextActor(context)
  const student: Student = {
    id: studentId,
    organizationId: context.organizationId,
    studentCode,
    status: "active",
    identity: {
      fullName: input.applicant.name,
      primaryPhone: input.applicant.phone,
      address: "—",
      dateOfBirth: "2000-01-01",
      qualificationId: lookups.qualifications[0]?.value ?? "",
      qualificationLabel: lookups.qualifications[0]?.label ?? "",
      graduationYear: 2020,
    },
    assignment: {
      registrationBranchId: input.branches.registrationBranchId,
      registrationBranchLabel: branchLabel(input.branches.registrationBranchId),
      studyBranchId: input.branches.studyBranchId,
      studyBranchLabel: branchLabel(input.branches.studyBranchId),
      departmentId: lookups.departments[0]?.value ?? "",
      departmentLabel: lookups.departments[0]?.label ?? "",
      customerServiceEmployeeId: context.employeeId,
      customerServiceEmployeeName: context.employeeName,
    },
    system: {
      admissionId: input.admissionId,
      admissionReference: input.admissionReference,
      approvalSnapshotId: input.approvalSnapshotId,
      admissionDate: admissionFacts?.approvedAt ?? now,
      enrollmentDate: now,
    },
    statusHistory: [
      {
        id: nextId("status-change") as StudentStatusChangeId,
        fromStatus: null,
        toStatus: "active",
        actor,
        occurredAt: now,
        sourceVersion: 0,
        resultVersion: 1,
      },
    ],
    createdAt: now,
    createdBy: actor,
    updatedAt: now,
    updatedBy: actor,
    version: 1,
  }

  enrollment.studentId = studentId
  store.students.push(student)
  store.enrollments.push(enrollment)
  store.intakeIndex.set(idempotencyKey, studentId)
  invalidateIndexes()

  // Seed a record per configured type so missing evidence is visible immediately.
  for (const type of lookups.documentTypes)
    store.documents.push({
      id: nextId("document") as StudentDocumentId,
      studentId,
      type,
      state: "missing",
      versions: [],
    })
  documentIndex = null

  if (admissionFacts?.submittedAt)
    appendEvent(
      studentId,
      "admission-submitted",
      "تم تقديم طلب القبول",
      context,
      input.admissionId,
      "admissions",
      admissionFacts.submittedAt
    )
  if (admissionFacts?.approvedAt)
    appendEvent(
      studentId,
      "admission-approved",
      "تم اعتماد طلب القبول",
      context,
      input.admissionId,
      "admissions",
      admissionFacts.approvedAt
    )
  appendEvent(
    studentId,
    "student-created",
    `تم إنشاء سجل الطالب بكود ${studentCode}`,
    context
  )
  appendEvent(
    studentId,
    "enrollment-added",
    `تمت إضافة تسجيل في ${enrollment.offeringLabel}`,
    context,
    enrollment.id
  )

  return { studentId, studentCode }
}

export const studentsService: StudentsService = {
  async list(query) {
    await guard("list")
    ensureScale()
    const context = scenarioContext()
    require(context, studentsPermissions.view)
    const normalized = normalizeStudentListQuery(query)

    const scoped = store.students.filter((student) =>
      isStudentInScope(student, context)
    )
    const filtered = scoped.filter((student) => {
      if (
        normalized.search &&
        !matchesSearch(student, normalized.search)
      )
        return false
      return matchesFilters(student, normalized)
    })

    const sorted = sortStudents(filtered, normalized.sort)
    const page = clampPage(normalized, sorted.length)
    const start = (page - 1) * normalized.pageSize
    const items = sorted
      .slice(start, start + normalized.pageSize)
      .map((student) => redactSummary(toSummary(student), context))

    return {
      items: clone(items),
      total: sorted.length,
      page,
      pageSize: normalized.pageSize,
      totalPages: Math.max(1, Math.ceil(sorted.length / normalized.pageSize)),
    } satisfies Paginated<StudentSummary>
  },

  async get(studentId) {
    await guard("detail")
    ensureScale()
    const context = scenarioContext()
    require(context, studentsPermissions.view)
    return toDetail(findStudent(studentId, context), context)
  },

  async lookups(): Promise<StudentLookups> {
    await scenarioDelay()
    const fixtures = studentLookupFixtures()
    return clone({
      branches: fixtures.branches,
      departments: fixtures.departments,
      academicGrades: fixtures.academicGrades,
      qualifications: fixtures.qualifications,
      customerServiceEmployees: fixtures.customerServiceEmployees,
      offerings: fixtures.offerings,
      batches: fixtures.batches,
      statuses: fixtures.statuses,
      documentTypes: fixtures.documentTypes,
      identityRules: fixtures.identityRules,
      imagePolicy: fixtures.imagePolicy,
      currency: fixtures.currency,
      precision: fixtures.precision,
    })
  },

  async listEnrollments(studentId) {
    await guard("detail")
    const context = scenarioContext()
    require(context, studentsPermissions.enrollmentsView)
    findStudent(studentId, context)
    return clone(sortEnrollments(enrollmentsOf(studentId)))
  },

  async listDocuments(studentId) {
    await guard("documents")
    const context = scenarioContext()
    require(context, studentsPermissions.documentsView)
    findStudent(studentId, context)
    return clone(sortDocuments(documentsOf(studentId)))
  },

  async documentHistory(studentId, documentId) {
    await guard("documents")
    const context = scenarioContext()
    require(context, studentsPermissions.documentsView)
    findStudent(studentId, context)
    const document = documentsOf(studentId).find(
      (item) => item.id === documentId
    )
    if (!document) throw new StudentsError("not-found")
    return clone(versionHistory(document))
  },

  async listNotes(studentId) {
    await guard("notes")
    const context = scenarioContext()
    require(context, studentsPermissions.notesView)
    findStudent(studentId, context)
    return clone(
      store.notes
        .filter((note) => note.studentId === studentId && !note.archivedAt)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    )
  },

  async listTimeline(studentId, query) {
    await guard("timeline")
    const context = scenarioContext()
    require(context, studentsPermissions.timelineView)
    findStudent(studentId, context)
    return clone(
      pageTimeline(timelineOf(studentId), query)
    ) satisfies Cursor<StudentTimelineEvent>
  },

  async listStatusHistory(studentId) {
    await guard("detail")
    const context = scenarioContext()
    require(context, studentsPermissions.view)
    const student = findStudent(studentId, context)
    return clone(
      [...student.statusHistory].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt)
      )
    ) satisfies StudentStatusChange[]
  },

  async getFinancialSummary(
    studentId,
    signal
  ): Promise<StudentFinancialSummaryResult> {
    await scenarioDelay()
    const context = scenarioContext()
    if (!hasStudentPermission(context, studentsPermissions.financeView))
      return { state: "forbidden" }
    findStudent(studentId, context)
    return scenarioFinanceReader().getFinancialSummary(studentId, signal)
  },

  async getContextSummary(studentId, signal) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, studentsPermissions.view)
    const student = findStudent(studentId, context)
    const enrollments = enrollmentsOf(studentId)
    const completion = documentCompletion(documentsOf(studentId))
    const finance = await this.getFinancialSummary(studentId, signal)
    return clone({
      studentId: student.id,
      studentCode: student.studentCode,
      fullName: student.identity.fullName,
      status: student.status,
      assignment: {
        registrationBranchId: student.assignment.registrationBranchId,
        studyBranchId: student.assignment.studyBranchId,
        departmentId: student.assignment.departmentId,
        academicGradeId: student.assignment.academicGradeId,
      },
      enrollmentTargets: enrollments.map((enrollment) => ({
        kind: enrollment.offeringKind,
        offeringId: enrollment.offeringId,
        batchId: enrollment.batchId,
        status: enrollment.status,
      })),
      documentCompletion: {
        requiredTypes: completion.requiredTypes,
        present: completion.present,
        missing: completion.missing,
      },
      financialSummaryRef: {
        state: finance.state,
        asOf: finance.state === "available" ? finance.summary.asOf : undefined,
      },
      admissionRef: {
        admissionId: student.system.admissionId,
        approvalSnapshotId: student.system.approvalSnapshotId,
      },
      updatedAt: student.updatedAt,
      version: student.version,
    }) satisfies StudentContextSummary
  },

  async exportList(query, signal) {
    const context = scenarioContext()
    require(context, studentsPermissions.export)
    const all = await this.list(
      { ...query, page: 1, pageSize: 1000 },
      signal
    )
    const header = [
      "student_code",
      "full_name",
      "status",
      "registration_branch",
      "study_branch",
      "department",
      "offering",
      "batch",
      "enrollments",
      "updated_at",
    ].join(",")
    const rows = all.items.map((item) =>
      [
        item.studentCode,
        `"${item.fullName}"`,
        item.status,
        `"${item.registrationBranchLabel}"`,
        `"${item.studyBranchLabel}"`,
        `"${item.departmentLabel}"`,
        `"${item.primaryOfferingLabel}"`,
        `"${item.primaryBatchLabel ?? ""}"`,
        item.enrollmentCount,
        item.updatedAt,
      ].join(",")
    )
    return [header, ...rows].join("\n")
  },

  async updateProfile(command: UpdateProfileCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, studentsPermissions.update)
    const student = findStudent(command.studentId, context)
    assertWritable(student)
    assertVersion(student, command.expectedVersion)

    student.identity = { ...student.identity, ...command.input.identity }
    student.assignment = { ...student.assignment, ...command.input.assignment }
    touch(student, context)
    appendEvent(
      student.id,
      "profile-updated",
      "تم تحديث بيانات الطالب",
      context
    )
    return toDetail(student, context)
  },

  async changeStatus(command: ChangeStatusCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    const student = findStudent(command.studentId, context)
    const evaluation = evaluateTransition({
      from: student.status,
      to: command.toStatus,
      reason: command.reason,
      permissions: context.permissions,
    })
    if (!evaluation.ok)
      throw new StudentsError(evaluation.code, {
        fromStatus: student.status,
        toStatus: command.toStatus,
        allowed: evaluation.allowed,
      })
    assertVersion(student, command.expectedVersion)

    const sourceVersion = student.version
    const fromStatus = student.status
    student.status = command.toStatus
    if (command.toStatus === "archived") {
      student.archivedAt = new Date().toISOString()
      student.archiveReason = command.reason
    } else {
      student.archivedAt = undefined
      student.archiveReason = undefined
    }
    touch(student, context)
    student.statusHistory.push({
      id: nextId("status-change") as StudentStatusChangeId,
      fromStatus,
      toStatus: command.toStatus,
      reason: command.reason,
      actor: contextActor(context),
      occurredAt: student.updatedAt,
      sourceVersion,
      resultVersion: student.version,
    })
    appendEvent(
      student.id,
      "status-changed",
      `تم تغيير حالة الطالب إلى ${command.toStatus}`,
      context
    )
    return toDetail(student, context)
  },

  async bulkChangeStatus(command: BulkChangeStatusCommand) {
    const outcomes: BulkStatusOutcome[] = []
    for (const item of command.items) {
      const student = store.students.find(
        (entry) => entry.id === item.studentId
      )
      try {
        await this.changeStatus(item)
        outcomes.push({
          studentId: item.studentId,
          studentCode: student?.studentCode ?? "—",
          outcome: "applied",
        })
      } catch (error) {
        const failure =
          error instanceof StudentsError
            ? error
            : new StudentsError("service-unavailable")
        outcomes.push({
          studentId: item.studentId,
          studentCode: student?.studentCode ?? "—",
          outcome: "refused",
          refusalCode: failure.code,
          message: failure.message,
        })
      }
    }
    return outcomes
  },

  async uploadDocument(command: UploadDocumentCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, studentsPermissions.documentsManage)
    const student = findStudent(command.studentId, context)
    assertWritable(student)

    const document = documentsOf(command.studentId).find(
      (item) => item.type.key === command.typeKey
    )
    if (!document) throw new StudentsError("not-found")

    // Idempotency is checked before the version assert: a retried attempt carries
    // the version the client held *before* the first upload landed, so asserting
    // first would reject every genuine retry as a conflict.
    const existing = findByUploadAttempt(document, command.uploadAttemptId)
    if (existing) return clone(document)

    assertVersion(student, command.expectedVersion)

    const rejection = validateFileAgainstType(command.file, document.type)
    if (rejection) throw new StudentsError(rejection)

    const version = buildVersion(command.file, command.uploadAttemptId, document, context)
    const updated = withNewVersion(document, version)
    replaceDocumentInStore(updated)
    touch(student, context)
    appendEvent(
      student.id,
      "document-uploaded",
      `تم رفع مستند ${document.type.label}`,
      context,
      document.id
    )
    return clone(updated)
  },

  async replaceDocument(command: ReplaceDocumentCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, studentsPermissions.documentsManage)
    const student = findStudent(command.studentId, context)
    assertWritable(student)

    const document = documentsOf(command.studentId).find(
      (item) => item.id === command.documentId
    )
    if (!document) throw new StudentsError("not-found")

    // Same ordering as upload: a retry must resolve to the stored version rather
    // than being rejected as a stale write.
    const existing = findByUploadAttempt(document, command.uploadAttemptId)
    if (existing) return clone(document)

    assertVersion(student, command.expectedVersion)

    const rejection = validateFileAgainstType(command.file, document.type)
    if (rejection) throw new StudentsError(rejection)

    const version = buildVersion(command.file, command.uploadAttemptId, document, context)
    const updated = withNewVersion(document, version)
    replaceDocumentInStore(updated)
    touch(student, context)
    appendEvent(
      student.id,
      "document-replaced",
      `تم استبدال مستند ${document.type.label}`,
      context,
      document.id
    )
    return clone(updated)
  },

  async archiveDocument(command: ArchiveDocumentCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, studentsPermissions.documentsManage)
    const student = findStudent(command.studentId, context)
    assertWritable(student)
    assertVersion(student, command.expectedVersion)

    const document = documentsOf(command.studentId).find(
      (item) => item.id === command.documentId
    )
    if (!document) throw new StudentsError("not-found")
    if (isArchived(document)) throw new StudentsError("document-archived")

    const updated: StudentDocument = {
      ...document,
      state: "archived",
      archivedAt: new Date().toISOString(),
      archivedBy: contextActor(context),
      archiveReason: command.reason,
    }
    replaceDocumentInStore(updated)
    touch(student, context)
    appendEvent(
      student.id,
      "document-archived",
      `تمت أرشفة مستند ${document.type.label}`,
      context,
      document.id
    )
    return clone(updated)
  },

  async addNote(command: AddNoteCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, studentsPermissions.notesManage)
    const student = findStudent(command.studentId, context)
    assertWritable(student)
    const content = command.content.trim()
    if (!content) throw new StudentsError("note-content-empty")

    const note: StudentNote = {
      id: nextId("note") as StudentNoteId,
      studentId: command.studentId,
      content,
      author: contextActor(context),
      createdAt: new Date().toISOString(),
    }
    store.notes.push(note)
    return clone(note)
  },

  async editNote(command: EditNoteCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, studentsPermissions.notesManage)
    const student = findStudent(command.studentId, context)
    assertWritable(student)
    const content = command.content.trim()
    if (!content) throw new StudentsError("note-content-empty")

    const note = store.notes.find((item) => item.id === command.noteId)
    if (!note || note.studentId !== command.studentId)
      throw new StudentsError("not-found")

    // Non-destructive revision: original author and creation time are preserved.
    note.content = content
    note.editedAt = new Date().toISOString()
    note.editedBy = contextActor(context)
    return clone(note)
  },

  async archiveNote(command: ArchiveNoteCommand) {
    await scenarioDelay()
    const context = scenarioContext()
    require(context, studentsPermissions.notesManage)
    const student = findStudent(command.studentId, context)
    assertWritable(student)

    const note = store.notes.find((item) => item.id === command.noteId)
    if (!note || note.studentId !== command.studentId)
      throw new StudentsError("not-found")

    // Soft archive only; notes are never permanently deleted (spec FR-040).
    note.archivedAt = new Date().toISOString()
    note.archivedBy = contextActor(context)
    return clone(note)
  },
}

function buildVersion(
  file: File,
  uploadAttemptId: string,
  document: StudentDocument,
  context: StudentServiceContext
): StudentDocumentVersion {
  return {
    id: nextId("document-version") as StudentDocumentVersionId,
    versionNumber: nextVersionNumber(document),
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: contextActor(context),
    uploadAttemptId,
  }
}

function replaceDocumentInStore(document: StudentDocument): void {
  const index = store.documents.findIndex((item) => item.id === document.id)
  if (index >= 0) store.documents[index] = document
  documentIndex = null
}

/** Test-only reader for the intake index. */
export function intakeIndexSize(): number {
  return store.intakeIndex.size
}
