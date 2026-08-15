import { serializeQuery } from "@/shared/utils/list-query"
import type { ExpenseRequestId } from "../types/common"
import type {
  CategoryListQuery,
  DashboardQuery,
  ExpenseRequestListQuery,
  SubCategoryListQuery,
} from "../types/commands"

const ROOT = "accounting" as const

/**
 * The scope fingerprint is the first variable segment of every key, so two scopes
 * can never read each other's cached results — a branch manager must not be
 * served an executive's cached list.
 */
export const accountingKeys = {
  all: (fingerprint: string) => [ROOT, fingerprint] as const,

  requestLists: (fingerprint: string) => [ROOT, fingerprint, "requests"] as const,
  requests: (fingerprint: string, query: ExpenseRequestListQuery) =>
    [ROOT, fingerprint, "requests", serializeQuery(query)] as const,

  request: (fingerprint: string, requestId: ExpenseRequestId) =>
    [ROOT, fingerprint, "request", requestId] as const,
  history: (fingerprint: string, requestId: ExpenseRequestId) =>
    [ROOT, fingerprint, "request", requestId, "history"] as const,
  comments: (fingerprint: string, requestId: ExpenseRequestId) =>
    [ROOT, fingerprint, "request", requestId, "comments"] as const,

  categoryLists: (fingerprint: string) => [ROOT, fingerprint, "categories"] as const,
  categories: (fingerprint: string, query: CategoryListQuery) =>
    [ROOT, fingerprint, "categories", serializeQuery(query)] as const,

  subCategoryLists: (fingerprint: string) =>
    [ROOT, fingerprint, "sub-categories"] as const,
  subCategories: (fingerprint: string, query: SubCategoryListQuery) =>
    [ROOT, fingerprint, "sub-categories", serializeQuery(query)] as const,

  dashboards: (fingerprint: string) => [ROOT, fingerprint, "dashboard"] as const,
  dashboard: (fingerprint: string, query: DashboardQuery) =>
    [ROOT, fingerprint, "dashboard", serializeQuery(query)] as const,

  lookups: (fingerprint: string) => [ROOT, fingerprint, "lookups"] as const,
} as const

export type AccountingMutationKind =
  | "request"
  | "attachment"
  | "comment"
  | "category"

/**
 * What each command invalidates.
 *
 * Every request-mutating kind invalidates the **dashboard** as well as the lists,
 * because a dashboard figure that disagrees with the list beneath it is exactly
 * the failure SC-005 forbids — and a stale cache is the only way that can happen
 * when both are derived from the same records.
 */
export function invalidationTargets(input: {
  kind: AccountingMutationKind
  fingerprint: string
  requestId?: ExpenseRequestId
}): readonly (readonly unknown[])[] {
  const { kind, fingerprint, requestId } = input
  const targets: (readonly unknown[])[] = []

  if (requestId) {
    targets.push(accountingKeys.request(fingerprint, requestId))
    targets.push(accountingKeys.history(fingerprint, requestId))
  }

  switch (kind) {
    case "request":
    case "attachment":
      return [
        ...targets,
        accountingKeys.requestLists(fingerprint),
        accountingKeys.dashboards(fingerprint),
      ]
    case "comment":
      return requestId
        ? [...targets, accountingKeys.comments(fingerprint, requestId)]
        : targets
    case "category":
      return [
        ...targets,
        accountingKeys.categoryLists(fingerprint),
        accountingKeys.subCategoryLists(fingerprint),
        accountingKeys.lookups(fingerprint),
        // A renamed or archived category changes what the queue and the
        // breakdowns display, so neither may keep a stale copy.
        accountingKeys.requestLists(fingerprint),
        accountingKeys.dashboards(fingerprint),
      ]
  }
}
