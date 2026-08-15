import type { ProgramBatchId, ProgramId } from "../types/common"
import type {
  BatchListQuery,
  CreateBatchCommand,
  TransitionBatchCommand,
  UpdateBatchCommand,
} from "../types/commands"
import type {
  BatchDetail,
  BatchLookups,
  BatchSummary,
  Eligibility,
  FinancialRevision,
  LifecycleEvent,
  Readiness,
} from "../types/domain"
import type { Paginated } from "../types/common"
export interface EnrollmentCountReader {
  getCurrentStudents(batchId: ProgramBatchId): Promise<number>
}
export interface ProgramBatchService {
  list(
    programId: ProgramId,
    query: BatchListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<BatchSummary>>
  get(
    programId: ProgramId,
    batchId: ProgramBatchId,
    signal?: AbortSignal
  ): Promise<BatchDetail>
  lookups(programId: ProgramId): Promise<BatchLookups>
  create(command: CreateBatchCommand): Promise<BatchDetail>
  update(command: UpdateBatchCommand): Promise<BatchDetail>
  transition(command: TransitionBatchCommand): Promise<BatchDetail>
  readiness(programId: ProgramId, batchId: ProgramBatchId): Promise<Readiness>
  eligibility(
    batchId: ProgramBatchId,
    branchId: string,
    today?: string
  ): Promise<Eligibility>
  lifecycle(batchId: ProgramBatchId): Promise<LifecycleEvent[]>
  revisions(batchId: ProgramBatchId): Promise<FinancialRevision[]>
}
