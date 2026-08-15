# Phase 1 Contracts: Accounting

**Feature**: 008-accounting | **Date**: 2026-08-01

The UI contract. One interface, `AccountingService`, with a deterministic mock behind it during
frontend development. Every screen depends on this and nothing else, so replacing the mock with a
REST client changes no screen.

---

## Permission keys

Sixteen keys. Review authority, marking paid, and cancelling are deliberately separate — that
separation is the module's internal control, and it only means anything if the keys are distinct
(FR-022a, FR-027).

```
accounting.view                      accounting.dashboard.view
accounting.requests.view             accounting.requests.create
accounting.requests.update           accounting.requests.submit
accounting.requests.review           accounting.requests.decide
accounting.requests.markPaid         accounting.requests.cancel
accounting.attachments.manage        accounting.comments.add
accounting.categories.view           accounting.categories.manage
accounting.history.view              accounting.export
```

Role mapping is configuration, not code:

| Role | Holds |
|---|---|
| Super Admin | all sixteen — `decide` as an administrative override |
| Finance Manager | all except `categories.manage` |
| Executive Manager | the six read keys plus `export` — **no** `decide`, `review`, `markPaid`, `cancel` |
| Branch Manager | view, create, update, submit, cancel, attachments, comments — within their branches |

Executive Manager holding no decision key is what makes "visibility without participation"
enforceable rather than a UI convention.

---

## Errors

`AccountingError` carries a code from a closed union plus structured details. **Every code has its
own Arabic message; there is no generic fallback** (R14).

```
forbidden · out-of-scope · not-found · version-conflict
invalid-transition · note-required · not-editable
category-required · category-inactive · subcategory-mismatch
amount-not-positive · amount-invalid
attachment-type-rejected · attachment-too-large
duplicate-name · validation-failed · invalid-date-range
```

`invalid-transition` carries `{ from, to }` so the message can say *why* an action is unavailable
from the current status rather than just refusing.

---

## Reads

```ts
listRequests(query: ExpenseRequestListQuery, signal?): Promise<Paginated<ExpenseRequestSummary>>
getRequest(id: ExpenseRequestId, signal?): Promise<ExpenseRequestDetail>
listHistory(id: ExpenseRequestId, signal?): Promise<HistoryEntry[]>
listComments(id: ExpenseRequestId, signal?): Promise<ExpenseComment[]>
listCategories(query: CategoryListQuery, signal?): Promise<Paginated<ExpenseCategorySummary>>
listSubCategories(query: SubCategoryListQuery, signal?): Promise<Paginated<ExpenseSubCategorySummary>>
getDashboard(query: DashboardQuery, signal?): Promise<AccountingDashboard>
lookups(signal?): Promise<AccountingLookups>
exportRequests(query: ExpenseRequestListQuery, signal?): Promise<ExportRow[]>
getAccountingExportContext(query, signal?): Promise<AccountingExportContext>
```

`ExpenseRequestListQuery` carries `search`, `branchIds`, `categoryIds`, `subCategoryIds`,
`requesterIds`, `statuses`, `dateRange { from, to, field: "requestDate" }`, `sort`, `page`,
`pageSize`. `CategoryListQuery` carries `search`, `statuses`, `page`, `pageSize`;
`SubCategoryListQuery` adds `categoryIds`.

`listCategories` accepts `activeOnly` for pickers, while `lookups()` resolves archived categories
for display — the two reads R7 requires.

Every read takes an `AbortSignal`, so the interface is already shaped for a network boundary.

---

## Commands

Every command carries `expectedVersion` except `createRequest` and `addComment`, which create
independent records. All are checked in the order **permission → scope → transition → version →
fields** (R5).

```ts
createRequest({ requestDate, branchId, categoryId, subCategoryId?, description, amount })
  -> ExpenseRequestDetail

updateRequest({ requestId, input, expectedVersion }) -> ExpenseRequestDetail
submitRequest({ requestId, expectedVersion }) -> ExpenseRequestDetail
startReview({ requestId, expectedVersion }) -> ExpenseRequestDetail

decideRequest({ requestId, decision: "approved"|"rejected"|"returned", note?, expectedVersion })
  -> ExpenseRequestDetail

markPaid({ requestId, expectedVersion }) -> ExpenseRequestDetail
cancelRequest({ requestId, reason, expectedVersion }) -> ExpenseRequestDetail

uploadAttachment({ requestId, kind, file, uploadAttempt, expectedVersion }) -> ExpenseRequestDetail
removeAttachment({ requestId, attachmentId, expectedVersion }) -> ExpenseRequestDetail

addComment({ requestId, body }) -> ExpenseComment

createCategory({ name, description }) -> ExpenseCategorySummary
updateCategory({ categoryId, input, expectedVersion }) -> ExpenseCategorySummary
setCategoryStatus({ categoryId, status, expectedVersion }) -> ExpenseCategorySummary
createSubCategory({ categoryId, name, description }) -> ExpenseSubCategorySummary
updateSubCategory({ subCategoryId, input, expectedVersion }) -> ExpenseSubCategorySummary
setSubCategoryStatus({ subCategoryId, status, expectedVersion }) -> ExpenseSubCategorySummary
```

**There is no delete on this interface** — not for requests, categories, attachments on a
non-editable request, comments, or history. A test enumerates the service surface and asserts no
`delete`/`remove`/`destroy`/`purge` name exists beyond `removeAttachment`, which is itself only
legal while the request is editable (FR-015, FR-033).

`startReview` is a command precisely because it changes state; opening the detail page must not
(R2).

---

## Projections

`ExpenseRequestSummary` — the list row: id, number, date, branch label, requester name, category
and sub-category labels, amount, status, attachment count, updatedAt, version.

`ExpenseRequestDetail` — everything the detail page needs in one read: the request, its
attachments, history, comments, the resolved category and sub-category (including archived ones),
`derived { isEditable, availableTransitions }`, and `permissions` — a flat record of what the
acting user may do to *this* request, so a screen never re-derives authority.

`AccountingDashboard` — `{ counts { pending, approved, rejected, paid }, monthlyTotal,
byBranch[], byCategory[], hasNoRecords, asOf }`. `hasNoRecords` is a fact, distinct from zeroes
(FR-045).

`AccountingExportContext` — settled facts and identities only for a future Reporting or Audit
module: request id, number, date, branch id, category id, amount, status, and decision timestamps.
No requester name, no description, no attachment metadata. A test asserts the exact field set, so
**adding** a field fails rather than leaking quietly.

---

## Query keys

```
["accounting", fingerprint, "requests", serialized(query)]
["accounting", fingerprint, "request", requestId]
["accounting", fingerprint, "request", requestId, "history"]
["accounting", fingerprint, "request", requestId, "comments"]
["accounting", fingerprint, "categories", serialized(query)]
["accounting", fingerprint, "sub-categories", serialized(query)]
["accounting", fingerprint, "dashboard", serialized(query)]
["accounting", fingerprint, "lookups"]
```

The scope fingerprint is the first variable segment of every key, so two scopes can never read
each other's cached results (R8). Queries are serialized with sorted keys, so key order never
causes a cache miss.

`invalidationTargets(kind)` returns what each command invalidates. Every request-mutating command
invalidates the request, the request lists, **and the dashboard** — because a dashboard figure that
disagrees with the list beneath it is exactly the failure SC-005 forbids.

---

## Scenario controller

Deterministic control for tests and the quickstart, driven through the service rather than through
component internals: latency, per-area failure, forced version conflict, fixed clock, permission
set, branch scope, and a 20,000-record scale mode for SC-009.
