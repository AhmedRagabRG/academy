import type { FinancialRevisionId } from "@/features/program-batches/types/common"
import { batchMoney } from "@/features/program-batches/utils/batch-money"
export const validFinancialProfile = {
  programPrice: batchMoney("1000"),
  registrationFee: batchMoney("100"),
  installmentsEnabled: false,
  installmentPlans: [],
  offers: [],
  currentRevisionId: "revision-test" as FinancialRevisionId,
}
