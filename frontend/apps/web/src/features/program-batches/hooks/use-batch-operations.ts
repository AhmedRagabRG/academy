"use client"
import { useQuery } from "@tanstack/react-query"
import type { ProgramBatchId } from "../types/common"
import { batchKeys } from "../services/program-batch-query-keys"
import { programBatchService as service } from "../services/active-program-batch-service"
export const useBatchEligibility = (id: ProgramBatchId, branchId: string) =>
  useQuery({
    queryKey: batchKeys.eligibility(id, branchId),
    queryFn: () => service.eligibility(id, branchId),
    enabled: Boolean(branchId),
  })
