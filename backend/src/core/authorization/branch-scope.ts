import type { CallerContext } from '../../shared/types/caller-context';

/**
 * The one place the branch visibility rule is expressed, so tickets, contacts
 * and the inbox cannot drift apart on what a branch-restricted user may see.
 *
 * Returns `null` when the caller is unrestricted, which callers splice into a
 * `where` clause as nothing at all rather than as an always-true condition.
 *
 * Two deliberate escape hatches, both required to add branches to a populated
 * system without locking people out of their own data:
 *
 *   * `organizationWide` sees every branch. That flag existed but was never
 *     read for an authorization decision until now.
 *   * An empty `branchIds` means unrestricted, not "no access". Every account
 *     that predates branches has an empty array.
 *
 * A row with a null `branchId` is visible to everyone, because every row that
 * predates branches has one — hiding them would empty the application.
 */
export const branchFilter = (c: CallerContext): { in: string[] } | null => {
  if (c.organizationWide) return null;
  // Defensive against a context built before branchIds existed: throwing here
  // would turn a shape mismatch into a 500 on every authorized request, and
  // absent is treated the same as empty everywhere else in this rule.
  const branchIds = c.branchIds ?? [];
  if (!branchIds.length) return null;
  return { in: branchIds };
};

/**
 * A `where` fragment restricting `key` to the caller's branches, or `{}` when
 * the caller is unrestricted. The null arm keeps unassigned rows visible.
 */
export const branchWhere = (
  c: CallerContext,
  key: string,
): Record<string, unknown> => {
  const filter = branchFilter(c);
  if (!filter) return {};
  return { OR: [{ [key]: filter }, { [key]: null }] };
};
