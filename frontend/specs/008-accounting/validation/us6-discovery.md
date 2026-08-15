# Validation: US6 — Find Requests Across Branches

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US6-1 a branch filter lists only that branch's requests | `request-filters.test.ts` — "filters by branch" |
| US6-2 filters compose, satisfying all of them | "satisfies every filter applied together" |
| US6-3 a date range includes its first and last day | `date-range-filters.test.ts` |
| US6-4 an empty result says nothing matched and offers to clear | `request-queue.test.tsx` |
| US6-5 a scoped user sees only their branches' requests | `accounting-scope.test.ts` |

## Date ranges include both edges

The seeded requests are recorded at **09:00**, so a `to` of that same date would
exclude them under a naive comparison — the off-by-one that silently drops the
last day of every range. Seven cases pin it: the day named by the upper bound is
included, so is the day named by the lower bound, a single-day range matches a
request recorded at any time that day, and the days either side are excluded.

An inverted range **throws** rather than returning zero rows: returning nothing
would look like "no matches" and hide the mistake entirely. In the toolbar it is
reported with `role="alert"`, both inputs marked `aria-invalid`, and the range is
**omitted from the query** rather than sent to a service that would refuse it —
the user should see the problem, not an error toast.

## Scope can only narrow, never widen

Asserted structurally: every row a scoped read returns was also in the
organization-wide read. Asking for another branch explicitly returns **zero**, not
that branch's rows — a filter narrows within the scope, it is not a way out of it.

A user with no branches gets an empty queue with `total: 0` and `totalPages: 1`,
rather than an error that would reveal rows exist.

**FR-048 — refusal, not silence**: an out-of-scope record is refused on direct
read, on its history, on its comments, and on every command against it. Creating a
request for another branch is refused too. Organization isolation is checked
**before** branch membership, so the same branch id in another organization is
still nothing.

## Export mirrors the list

Same scope, same filters, same search, same inverted-range refusal — asserted by
comparing exported row count against the list total for each. It carries readable
labels rather than raw ids, the amount as a decimal string, and an empty string
rather than `undefined` for an absent sub-category.

`accounting.export` is distinct from `requests.view`: one case reads a populated
queue successfully and is then refused the export. Reading a queue on screen and
taking the data away are different acts.

## Performance shapes, from the first commit

`listRequests` joins through the by-id indexes — never `.find()` inside a
`filter` — and computes sort keys once per row rather than inside the comparator.
Both were measured as real defects in Student Finance at scale (research R11), so
they are built in here rather than retrofitted after a measurement fails. Amount
sorting compares integer minor units, so no float touches a money value.

## Named bulk actions

The shared table's Phase 2 extension in use. Two actions — submit selected,
approve selected — each hidden when the acting user lacks its permission, because
an action they can never take is noise rather than an affordance.

A bulk action applies **only to eligible rows**: submitting a selection of a draft
and a paid request submits the draft alone. When rows are skipped the user is told;
when none are, they are not. A row that cannot take the action is not an error for
the rows that can, but it must not vanish silently either.

## Empty states

"No request matched these filters" and "no request exists" are different facts.
The empty state distinguishes them from `hasActiveRequestFilters`, and offers the
clear-filters control only in the first case.

Filter options come from lookups — a new branch or category reaches the toolbar as
data. Clearing a group sets it to `undefined`, not to an empty array: the latter
would mean "match nothing".

## Success criteria

- **SC-010** users see no request from a branch outside their scope, on any list,
  detail, or export — PASS
- **SC-011** every refusal names its reason — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build`, and the
Accounting suites (41 files, 550 tests) all pass.
