import { mockOrganizationSettingsService } from "@/features/organization-settings"
import type {
  AccountingDependencyReaders,
  BranchRef,
  OrganizationDirectoryReader,
} from "./accounting-dependency-readers"

/**
 * Adapters over sibling modules' **public** exports only.
 *
 * The single cross-feature import is `@/features/organization-settings`, and it
 * is one-way: nothing in that module knows Accounting exists. Branches are read,
 * never created here.
 */

/** Labels resolved once per read and cached, so a list never re-queries per row. */
let branchLabels = new Map<string, string>()

export const organizationDirectoryReader: OrganizationDirectoryReader = {
  async listBranches(): Promise<BranchRef[]> {
    const page = await mockOrganizationSettingsService.list("branches", {
      page: 1,
      pageSize: 200,
    })
    const branches = page.items.map((branch) => ({
      id: String(branch.id),
      label: branch.name,
      active: branch.status === "active",
    }))
    branchLabels = new Map(branches.map((branch) => [branch.id, branch.label]))
    return branches
  },

  branchLabel(branchId: string): string {
    // An unknown branch reads as its own id rather than as an empty cell, so a
    // stale reference is visible instead of silently blank.
    return branchLabels.get(branchId) ?? branchId
  },
}

export const accountingDependencyReaders: AccountingDependencyReaders = {
  organization: organizationDirectoryReader,
}

/** Primes the label cache. Called by the mock service on first read. */
export async function primeBranchLabels(): Promise<void> {
  if (branchLabels.size === 0) await organizationDirectoryReader.listBranches()
}
