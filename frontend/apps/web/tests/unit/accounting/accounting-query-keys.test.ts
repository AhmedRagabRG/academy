import { describe, expect, it } from "vitest"
import {
  accountingKeys,
  invalidationTargets,
  type AccountingMutationKind,
} from "@/features/accounting/services/accounting-query-keys"
import type { ExpenseRequestId } from "@/features/accounting/types/common"

const fingerprint = "organization-alsalam:all:a,b"
const requestId = "request-1" as ExpenseRequestId
const serialize = (key: readonly unknown[]) => JSON.stringify(key)

describe("the scope fingerprint keys every query", () => {
  it("appears as the first variable segment of every key", () => {
    const keys = [
      accountingKeys.requests(fingerprint, { page: 1, pageSize: 20 }),
      accountingKeys.request(fingerprint, requestId),
      accountingKeys.history(fingerprint, requestId),
      accountingKeys.comments(fingerprint, requestId),
      accountingKeys.categories(fingerprint, { page: 1, pageSize: 20 }),
      accountingKeys.subCategories(fingerprint, { page: 1, pageSize: 20 }),
      accountingKeys.dashboard(fingerprint, {}),
      accountingKeys.lookups(fingerprint),
    ]
    for (const key of keys) expect(key[1]).toBe(fingerprint)
  })

  it("produces different keys for different scopes", () => {
    // Otherwise a branch manager could be served an executive's cached list.
    expect(serialize(accountingKeys.requests(fingerprint, { page: 1, pageSize: 20 }))).not.toBe(
      serialize(accountingKeys.requests("other-scope", { page: 1, pageSize: 20 }))
    )
  })

  it("produces the same key whatever order the query properties arrive in", () => {
    expect(
      serialize(accountingKeys.requests(fingerprint, { page: 1, pageSize: 20, search: "x" }))
    ).toBe(
      serialize(accountingKeys.requests(fingerprint, { search: "x", pageSize: 20, page: 1 }))
    )
  })
})

/**
 * SC-005 requires every dashboard figure to equal the equivalent filtered list.
 * Both are derived from the same records, so the only way they can disagree is a
 * stale cache — which makes this invalidation the guarantee.
 */
describe("every request-mutating command invalidates the dashboard", () => {
  for (const kind of ["request", "attachment"] as AccountingMutationKind[]) {
    it(`invalidates the dashboard for ${kind}`, () => {
      const targets = invalidationTargets({ kind, fingerprint, requestId }).map(serialize)
      expect(targets).toContain(serialize(accountingKeys.dashboards(fingerprint)))
    })

    it(`invalidates the request lists for ${kind}`, () => {
      const targets = invalidationTargets({ kind, fingerprint, requestId }).map(serialize)
      expect(targets).toContain(serialize(accountingKeys.requestLists(fingerprint)))
    })

    it(`invalidates the request itself and its history for ${kind}`, () => {
      const targets = invalidationTargets({ kind, fingerprint, requestId }).map(serialize)
      expect(targets).toContain(serialize(accountingKeys.request(fingerprint, requestId)))
      expect(targets).toContain(serialize(accountingKeys.history(fingerprint, requestId)))
    })
  }

  it("invalidates the queue and the dashboard when a category changes", () => {
    // A renamed or archived category changes what both surfaces display.
    const targets = invalidationTargets({ kind: "category", fingerprint }).map(serialize)
    expect(targets).toContain(serialize(accountingKeys.categoryLists(fingerprint)))
    expect(targets).toContain(serialize(accountingKeys.lookups(fingerprint)))
    expect(targets).toContain(serialize(accountingKeys.requestLists(fingerprint)))
    expect(targets).toContain(serialize(accountingKeys.dashboards(fingerprint)))
  })

  it("does not invalidate the dashboard for a comment", () => {
    // A comment changes no figure; invalidating the dashboard would be noise.
    const targets = invalidationTargets({ kind: "comment", fingerprint, requestId }).map(
      serialize
    )
    expect(targets).not.toContain(serialize(accountingKeys.dashboards(fingerprint)))
    expect(targets).toContain(serialize(accountingKeys.comments(fingerprint, requestId)))
  })
})
