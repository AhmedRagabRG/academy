import type { ProgramBatchId } from "../types/common"
import type { BatchSummary } from "../types/domain"
import { deriveCapacity } from "../utils/batch-capacity"
import { batchMoney } from "../utils/batch-money"
export function buildScaleBatches(count = 10_000): BatchSummary[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `batch-scale-${i + 1}` as ProgramBatchId,
    programId: "product-professional" as BatchSummary["programId"],
    name: `دفعة مهنية ${i + 1}`,
    code: `BATCH-${String(i + 1).padStart(5, "0")}`,
    academicYear: i % 2 ? "2026/2027" : "2027/2028",
    intake: i % 3 ? "الخريف" : "الربيع",
    registrationEndDate: "2026-12-01",
    studyStartDate: "2027-01-01",
    status: i % 6 === 0 ? "draft" : "registration-open",
    capacity: deriveCapacity(30, i % 31),
    price: batchMoney(String(10000 + i)),
    branchCount: 1,
    updatedAt: new Date(Date.UTC(2026, 0, 1 + (i % 180))).toISOString(),
    version: 1,
  }))
}
