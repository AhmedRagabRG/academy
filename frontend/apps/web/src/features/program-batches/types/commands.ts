import type { BatchStatus, ProgramBatchId, ProgramId } from "./common"
import type { ProgramBatch } from "./domain"
export type BatchInput = Pick<
  ProgramBatch,
  | "name"
  | "code"
  | "academicYearId"
  | "intakeId"
  | "description"
  | "schedule"
  | "financialProfile"
  | "branchAssignments"
> & { maximumStudents: number }
export interface BatchListQuery {
  search?: string
  academicYearId?: string
  intakeId?: string
  branchId?: string
  status?: BatchStatus | "all"
  sort?: "updatedAt" | "name" | "code" | "status"
  direction?: "asc" | "desc"
  page: number
  pageSize: number
}
export interface CreateBatchCommand {
  programId: ProgramId
  input: BatchInput
}
export interface UpdateBatchCommand {
  programId: ProgramId
  batchId: ProgramBatchId
  input: BatchInput
  expectedVersion: number
}
export interface TransitionBatchCommand {
  programId: ProgramId
  batchId: ProgramBatchId
  toStatus: BatchStatus
  reason?: string
  expectedVersion: number
}
