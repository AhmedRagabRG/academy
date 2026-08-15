import type {
  ProgramBatchId,
  ProgramId,
  FinancialRevisionId,
} from "../types/common"
import type { ProgramBatchService } from "./program-batch-service"
import type { BatchDetail, BatchSummary, ProgramBatch } from "../types/domain"
import { seededBatches } from "../data/program-batch-fixtures"
import { programBatchLookups } from "../data/program-batch-lookups"
import { batchScenarios } from "./mock-scenario-controller"
import { ProgramBatchError } from "./program-batch-error"
import { clone, normalizeCode, normalizeSearch } from "../utils/normalization"
import { deriveCapacity } from "../utils/batch-capacity"
import { getReadiness } from "../utils/batch-readiness"
import { getEligibility } from "../utils/batch-eligibility"
import { transitionAllowed } from "../utils/batch-lifecycle"
import { mockEnrollmentCountReader } from "./mock-enrollment-count-reader"

let records = clone(seededBatches)
const wait = async () => {
  if (batchScenarios.get() === "latency")
    await new Promise((r) => setTimeout(r, 500))
  if (batchScenarios.get() === "forbidden")
    throw new ProgramBatchError("forbidden", "ليس لديك صلاحية", "forbidden")
  if (batchScenarios.get() === "unavailable")
    throw new ProgramBatchError(
      "unavailable",
      "الخدمة غير متاحة",
      "unavailable",
      undefined,
      true
    )
  if (batchScenarios.get() === "unexpected")
    throw new ProgramBatchError("unexpected", "حدث خطأ غير متوقع")
}
function detail(batch: ProgramBatch): BatchDetail {
  const year =
    programBatchLookups.academicYears.find(
      (x) => x.value === batch.academicYearId
    )?.label ?? batch.academicYearId
  const intake =
    programBatchLookups.intakes.find((x) => x.value === batch.intakeId)
      ?.label ?? batch.intakeId
  return {
    ...clone(batch),
    programName: programBatchLookups.program.name,
    academicYearName: year,
    intakeName: intake,
  }
}
function find(programId: ProgramId, id: ProgramBatchId) {
  const batch = records.find((x) => x.id === id && x.programId === programId)
  if (!batch)
    throw new ProgramBatchError("not-found", "الدفعة غير موجودة", "not-found")
  return batch
}
function summary(batch: ProgramBatch): BatchSummary {
  return {
    id: batch.id,
    programId: batch.programId,
    name: batch.name.ar,
    code: batch.code,
    academicYear:
      programBatchLookups.academicYears.find(
        (x) => x.value === batch.academicYearId
      )?.label ?? batch.academicYearId,
    intake:
      programBatchLookups.intakes.find((x) => x.value === batch.intakeId)
        ?.label ?? batch.intakeId,
    registrationEndDate: batch.schedule.registrationEndDate,
    studyStartDate: batch.schedule.studyStartDate,
    status: batch.status,
    capacity: batch.capacity,
    price: batch.financialProfile.programPrice,
    branchCount: new Set(batch.branchAssignments.map((x) => x.branchId)).size,
    updatedAt: batch.updatedAt,
    version: batch.version,
  }
}
export const mockProgramBatchService: ProgramBatchService = {
  async list(programId, query, signal) {
    await wait()
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    if (batchScenarios.get() === "empty")
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: query.pageSize,
        totalPages: 1,
      }
    let items = records.filter((x) => x.programId === programId)
    const s = normalizeSearch(query.search)
    if (s)
      items = items.filter((x) =>
        normalizeSearch(
          `${x.name.ar} ${x.name.en ?? ""} ${x.code} ${programBatchLookups.program.name}`
        ).includes(s)
      )
    if (query.academicYearId)
      items = items.filter((x) => x.academicYearId === query.academicYearId)
    if (query.intakeId)
      items = items.filter((x) => x.intakeId === query.intakeId)
    if (query.branchId)
      items = items.filter((x) =>
        x.branchAssignments.some((b) => b.branchId === query.branchId)
      )
    if (query.status && query.status !== "all")
      items = items.filter((x) => x.status === query.status)
    const key = query.sort ?? "updatedAt",
      dir = query.direction === "asc" ? 1 : -1
    items.sort(
      (a, b) =>
        String(
          key === "name" ? a.name.ar : a[key as "code" | "status" | "updatedAt"]
        ).localeCompare(
          String(
            key === "name"
              ? b.name.ar
              : b[key as "code" | "status" | "updatedAt"]
          )
        ) * dir || a.id.localeCompare(b.id)
    )
    const total = items.length,
      totalPages = Math.max(1, Math.ceil(total / query.pageSize)),
      page = Math.min(Math.max(1, query.page), totalPages),
      start = (page - 1) * query.pageSize
    return {
      items: items.slice(start, start + query.pageSize).map(summary),
      total,
      page,
      pageSize: query.pageSize,
      totalPages,
    }
  },
  async get(programId, id) {
    await wait()
    const batch = find(programId, id)
    batch.capacity = deriveCapacity(
      batch.capacity.maximumStudents,
      await mockEnrollmentCountReader.getCurrentStudents(id)
    )
    return detail(batch)
  },
  async lookups(programId) {
    await wait()
    if (programId !== programBatchLookups.program.id)
      throw new ProgramBatchError(
        "program-not-eligible",
        "البرنامج غير مؤهل للدفعات",
        "validation"
      )
    return clone(programBatchLookups)
  },
  async create(command) {
    await wait()
    const code = normalizeCode(command.input.code)
    if (
      batchScenarios.get() === "duplicate" ||
      records.some((x) => x.code === code)
    )
      throw new ProgramBatchError(
        "duplicate-code",
        "رمز الدفعة مستخدم",
        "validation",
        { code: "رمز الدفعة مستخدم" }
      )
    const now = new Date().toISOString(),
      id = `batch-${Date.now()}` as ProgramBatchId,
      revisionId = `revision-${Date.now()}` as FinancialRevisionId
    const financialProfile = {
      ...clone(command.input.financialProfile),
      currentRevisionId: revisionId,
    }
    const batch: ProgramBatch = {
      ...clone(command.input),
      id,
      programId: command.programId,
      code,
      capacity: deriveCapacity(command.input.maximumStudents, 0),
      financialProfile,
      status: "draft",
      codeLocked: false,
      lifecycle: [
        {
          id: `event-${Date.now()}`,
          fromStatus: null,
          toStatus: "draft",
          actorId: "employee-demo",
          occurredAt: now,
          resultVersion: 1,
        },
      ],
      financialRevisions: [
        {
          id: revisionId,
          revisionNumber: 1,
          snapshot: financialProfile,
          createdAt: now,
          createdBy: "employee-demo",
          sourceBatchVersion: 1,
        },
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: "employee-demo",
      updatedBy: "employee-demo",
      version: 1,
    }
    records.push(batch)
    return detail(batch)
  },
  async update(command) {
    await wait()
    const batch = find(command.programId, command.batchId)
    if (
      batch.version !== command.expectedVersion ||
      batchScenarios.get() === "stale"
    )
      throw new ProgramBatchError(
        "stale-version",
        "تم تعديل الدفعة في جلسة أخرى",
        "conflict"
      )
    if (command.input.maximumStudents < batch.capacity.currentStudents)
      throw new ProgramBatchError(
        "capacity-below-current",
        "السعة أقل من عدد الطلاب الحالي",
        "validation",
        { maximumStudents: "لا يمكن خفض السعة عن العدد الحالي" }
      )
    const code = batch.codeLocked
      ? batch.code
      : normalizeCode(command.input.code)
    if (records.some((x) => x.id !== batch.id && x.code === code))
      throw new ProgramBatchError(
        "duplicate-code",
        "رمز الدفعة مستخدم",
        "validation",
        { code: "رمز الدفعة مستخدم" }
      )
    const financialChanged =
      JSON.stringify(batch.financialProfile) !==
      JSON.stringify(command.input.financialProfile)
    const nextRevisionId = financialChanged
      ? (`revision-${batch.id}-${batch.financialRevisions.length + 1}` as FinancialRevisionId)
      : batch.financialProfile.currentRevisionId
    Object.assign(batch, clone(command.input), {
      code,
      financialProfile: {
        ...clone(command.input.financialProfile),
        currentRevisionId: nextRevisionId,
      },
      capacity: deriveCapacity(
        command.input.maximumStudents,
        batch.capacity.currentStudents
      ),
      version: batch.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: "employee-demo",
    })
    if (financialChanged)
      batch.financialRevisions.push({
        id: nextRevisionId,
        revisionNumber: batch.financialRevisions.length + 1,
        snapshot: clone(batch.financialProfile),
        createdAt: batch.updatedAt,
        createdBy: "employee-demo",
        sourceBatchVersion: batch.version,
      })
    return detail(batch)
  },
  async transition(command) {
    await wait()
    const batch = find(command.programId, command.batchId)
    if (batch.version !== command.expectedVersion)
      throw new ProgramBatchError(
        "stale-version",
        "تم تعديل الدفعة",
        "conflict"
      )
    const d = detail(batch)
    if (!transitionAllowed(d, command.toStatus))
      throw new ProgramBatchError(
        "invalid-transition",
        "الانتقال غير مسموح",
        "validation"
      )
    if (
      ["archived", "registration-closed", "draft"].includes(command.toStatus) &&
      !command.reason?.trim()
    )
      throw new ProgramBatchError(
        "reason-required",
        "سبب الإجراء مطلوب",
        "validation"
      )
    const from = batch.status
    batch.status = command.toStatus
    batch.version++
    batch.updatedAt = new Date().toISOString()
    if (command.toStatus === "registration-open") batch.codeLocked = true
    batch.lifecycle.push({
      id: `event-${Date.now()}`,
      fromStatus: from,
      toStatus: command.toStatus,
      reason: command.reason,
      actorId: "employee-demo",
      occurredAt: batch.updatedAt,
      resultVersion: batch.version,
    })
    return detail(batch)
  },
  async readiness(programId, id) {
    return getReadiness(await this.get(programId, id))
  },
  async eligibility(id, branchId, today) {
    const batch = records.find((x) => x.id === id)
    if (!batch)
      throw new ProgramBatchError("not-found", "الدفعة غير موجودة", "not-found")
    return getEligibility(detail(batch), branchId, today)
  },
  async lifecycle(id) {
    return clone(records.find((x) => x.id === id)?.lifecycle ?? [])
  },
  async revisions(id) {
    return clone(records.find((x) => x.id === id)?.financialRevisions ?? [])
  },
}
export const resetMockProgramBatches = () => {
  records = clone(seededBatches)
}
