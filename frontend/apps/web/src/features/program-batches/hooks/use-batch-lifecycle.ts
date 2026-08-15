"use client"
import { useQuery } from "@tanstack/react-query"
import type { ProgramBatchId, ProgramId } from "../types/common"
import { batchKeys } from "../services/program-batch-query-keys"
import { programBatchService as service } from "../services/active-program-batch-service"
export const useBatchReadiness = (p: ProgramId, b: ProgramBatchId) =>
  useQuery({
    queryKey: batchKeys.readiness(p, b),
    queryFn: () => service.readiness(p, b),
  })
export const useBatchLifecycle = (b: ProgramBatchId) =>
  useQuery({
    queryKey: batchKeys.lifecycle(b),
    queryFn: () => service.lifecycle(b),
  })
