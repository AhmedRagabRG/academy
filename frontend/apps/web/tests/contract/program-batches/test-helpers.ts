import {
  mockProgramBatchService,
  resetMockProgramBatches,
} from "@/features/program-batches/services/mock-program-batch-service"
import type {
  FinancialRevisionId,
  ProgramId,
} from "@/features/program-batches/types/common"
import { batchMoney } from "@/features/program-batches/utils/batch-money"
export const batchContract = mockProgramBatchService
export const resetBatchContract = resetMockProgramBatches
export const testProgramId = "product-professional" as ProgramId
export const validBatchInput = {
  name: { ar: "دفعة عقد" },
  code: "CONTRACT-1",
  academicYearId: "year-2026",
  intakeId: "fall",
  description: "",
  schedule: {
    registrationStartDate: "2026-08-01",
    registrationEndDate: "2026-09-01",
    studyStartDate: "2026-09-01",
    studyEndDate: "2027-01-01",
  },
  maximumStudents: 20,
  financialProfile: {
    programPrice: batchMoney("1000"),
    registrationFee: batchMoney("100"),
    installmentsEnabled: false,
    installmentPlans: [],
    offers: [],
    currentRevisionId: "new" as FinancialRevisionId,
  },
  branchAssignments: [
    {
      branchId: "branch-cairo",
      role: "registration" as const,
      status: "active" as const,
    },
    {
      branchId: "branch-cairo",
      role: "study" as const,
      status: "active" as const,
    },
  ],
}
