import type { EnrollmentCountReader } from "./program-batch-service"
import type { ProgramBatchId } from "../types/common"
const counts = new Map<string, number>([["batch-fall-2026", 12]])
export const mockEnrollmentCountReader: EnrollmentCountReader = {
  async getCurrentStudents(id: ProgramBatchId) {
    return counts.get(id) ?? 0
  },
}
export const setMockEnrollmentCount = (id: string, count: number) =>
  counts.set(id, count)
