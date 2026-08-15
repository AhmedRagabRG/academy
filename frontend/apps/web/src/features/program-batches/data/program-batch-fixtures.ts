import type {
  FinancialRevisionId,
  ProgramBatchId,
  ProgramId,
} from "../types/common"
import type { ProgramBatch } from "../types/domain"
import { deriveCapacity } from "../utils/batch-capacity"
import { batchMoney } from "../utils/batch-money"
const revisionId = "revision-1" as FinancialRevisionId
const financialProfile = {
  programPrice: batchMoney("18000.00"),
  registrationFee: batchMoney("500.00"),
  installmentsEnabled: true,
  installmentPlans: [
    {
      id: "plan-1",
      name: "الخطة القياسية",
      basis: "percentage" as const,
      coveredCharge: "combined" as const,
      status: "active" as const,
      installments: [
        {
          id: "installment-1",
          label: "الدفعة الأولى",
          value: "50",
          milestoneId: "registration-start",
          position: 0,
        },
        {
          id: "installment-2",
          label: "الدفعة الثانية",
          value: "50",
          milestoneId: "study-start",
          position: 1,
        },
      ],
    },
  ],
  offers: [],
  currentRevisionId: revisionId,
}
export const seededBatches: ProgramBatch[] = [
  {
    id: "batch-fall-2026" as ProgramBatchId,
    programId: "product-professional" as ProgramId,
    name: { ar: "دفعة خريف 2026", en: "Fall 2026" },
    code: "PLP-F26",
    academicYearId: "year-2026",
    intakeId: "fall",
    description: "دفعة القيادة المهنية",
    schedule: {
      registrationStartDate: "2026-07-01",
      registrationEndDate: "2026-12-01",
      studyStartDate: "2026-12-01",
      studyEndDate: "2027-05-31",
      graduationDate: "2027-06-15",
    },
    capacity: deriveCapacity(30, 12),
    financialProfile,
    branchAssignments: [
      { branchId: "branch-cairo", role: "registration", status: "active" },
      { branchId: "branch-cairo", role: "study", status: "active" },
    ],
    status: "registration-open",
    codeLocked: true,
    lifecycle: [
      {
        id: "event-1",
        fromStatus: null,
        toStatus: "draft",
        actorId: "system",
        occurredAt: "2026-01-01T00:00:00.000Z",
        resultVersion: 1,
      },
      {
        id: "event-2",
        fromStatus: "draft",
        toStatus: "registration-open",
        reason: "اعتماد الدفعة",
        actorId: "employee-demo",
        occurredAt: "2026-07-01T00:00:00.000Z",
        resultVersion: 2,
      },
    ],
    financialRevisions: [
      {
        id: revisionId,
        revisionNumber: 1,
        snapshot: financialProfile,
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: "system",
        sourceBatchVersion: 1,
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    createdBy: "system",
    updatedBy: "employee-demo",
    version: 2,
  },
]
