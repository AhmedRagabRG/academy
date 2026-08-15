import type { BatchListQuery } from "../types/commands"
export const batchKeys = {
  all: ["program-batches"] as const,
  lookups: (programId: string) =>
    [...batchKeys.all, "lookups", programId] as const,
  list: (programId: string, q: BatchListQuery) =>
    [...batchKeys.all, "list", programId, q] as const,
  detail: (programId: string, id: string) =>
    [...batchKeys.all, "detail", programId, id] as const,
  readiness: (programId: string, id: string) =>
    [...batchKeys.detail(programId, id), "readiness"] as const,
  eligibility: (id: string, branchId: string) =>
    [...batchKeys.all, "eligibility", id, branchId] as const,
  lifecycle: (id: string) => [...batchKeys.all, "lifecycle", id] as const,
  revisions: (id: string) => [...batchKeys.all, "revisions", id] as const,
}
