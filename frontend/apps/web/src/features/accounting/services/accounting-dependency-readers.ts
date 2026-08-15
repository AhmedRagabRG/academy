import type { LookupOption } from "../types/common"

/**
 * Accounting-owned reader ports.
 *
 * Each is a narrow interface satisfied by an adapter over another module's
 * **public** exports. Accounting never imports another feature's fixtures,
 * schemas, hooks, or components — and nothing imports Accounting back, so there
 * is no cycle to close.
 */

export interface BranchRef {
  id: string
  label: string
  active: boolean
}

export interface OrganizationDirectoryReader {
  listBranches(signal?: AbortSignal): Promise<BranchRef[]>
  branchLabel(branchId: string): string
}

export interface ActorDirectoryReader {
  /** Requesters seen on existing requests, for the requester filter. */
  listRequesters(signal?: AbortSignal): Promise<LookupOption[]>
}

export interface AccountingDependencyReaders {
  organization: OrganizationDirectoryReader
}
