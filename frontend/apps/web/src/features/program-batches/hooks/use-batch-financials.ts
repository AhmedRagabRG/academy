"use client"
import { useQuery } from "@tanstack/react-query"
import type { ProgramBatchId } from "../types/common"
import { batchKeys } from "../services/program-batch-query-keys"
import { programBatchService as service } from "../services/active-program-batch-service"
export const useBatchRevisions = (id: ProgramBatchId) =>
  useQuery({
    queryKey: batchKeys.revisions(id),
    queryFn: () => service.revisions(id),
  })
