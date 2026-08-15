"use client"
import { useQuery } from "@tanstack/react-query"
import type { ProgramBatchId, ProgramId } from "../types/common"
import type { BatchListQuery } from "../types/commands"
import { programBatchService as service } from "../services/active-program-batch-service"
import { batchKeys } from "../services/program-batch-query-keys"
export const useBatchLookups = (programId: ProgramId) =>
  useQuery({
    queryKey: batchKeys.lookups(programId),
    queryFn: () => service.lookups(programId),
  })
export const useBatches = (programId: ProgramId, query: BatchListQuery) =>
  useQuery({
    queryKey: batchKeys.list(programId, query),
    queryFn: ({ signal }) => service.list(programId, query, signal),
    placeholderData: (p) => p,
  })
export const useBatch = (programId: ProgramId, id: ProgramBatchId) =>
  useQuery({
    queryKey: batchKeys.detail(programId, id),
    queryFn: ({ signal }) => service.get(programId, id, signal),
  })
