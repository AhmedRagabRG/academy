# Phase 1 Data Model: Accounting

**Feature**: 008-accounting | **Date**: 2026-08-01

Every entity below is owned by this module unless marked **read-only**, in which case it is read
through a port over another module's public exports. Money is always `Money` from
`@/shared/utils/money` — a decimal string with a currency and a precision, never a number.

---

## Identifiers

Branded opaque string types, so a category id can never be passed where a request id belongs:

```
ExpenseRequestId · ExpenseCategoryId · ExpenseSubCategoryId
AttachmentId · HistoryEntryId · CommentId
```

---

## Enumerations

### `ExpenseStatus`

`draft · submitted · under-review · returned-for-revision · approved · rejected · paid · cancelled`

### `HistoryAction`

`created · submitted · review-started · returned · resubmitted · approved · rejected · paid · cancelled`

One action per transition, named after what happened rather than the resulting state — `returned`
and `resubmitted` are different events even though the status they leave behind is the same on the
next hop.

### `AttachmentKind`

`invoice · receipt · supporting-document`

### `CategoryStatus`

`active · archived`

---

## Entities

### `ExpenseCategory`

| Field | Type | Notes |
|---|---|---|
| `id` | `ExpenseCategoryId` | |
| `organizationId` | `string` | Tenant boundary |
| `name` | `string` | Unique across the organization (FR-008) |
| `description` | `string` | |
| `status` | `CategoryStatus` | Archived categories stay resolvable for display (FR-006) |
| audit | `createdAt/By`, `updatedAt/By`, `version` | |

### `ExpenseSubCategory`

| Field | Type | Notes |
|---|---|---|
| `id` | `ExpenseSubCategoryId` | |
| `categoryId` | `ExpenseCategoryId` | Exactly one parent (FR-005) |
| `name` | `string` | Unique **within its parent** (FR-008) |
| `description` | `string` | |
| `status` | `CategoryStatus` | |
| audit | as above | |

A sub-category is offered only when its parent is both chosen and active — archiving a parent
removes its children from the choices without touching their own status (FR-006, US4-5).

### `ExpenseRequest`

| Field | Type | Notes |
|---|---|---|
| `id` | `ExpenseRequestId` | |
| `organizationId` | `string` | |
| `requestNumber` | `string` | Unique, from the configured pattern (FR-011) |
| `requestDate` | `string` | ISO date |
| `branchId` | `string` | Exactly one (FR-010) |
| `requestedBy` | `ActorRef` | Denormalized, so a departed requester is still named (FR-010) |
| `categoryId` | `ExpenseCategoryId` | Required |
| `subCategoryId` | `ExpenseSubCategoryId?` | Optional; must belong to `categoryId` |
| `description` | `string` | |
| `amount` | `Money` | Greater than zero (FR-012). **The only amount** (FR-030a) |
| `status` | `ExpenseStatus` | |
| `reviewer` | `ActorRef?` | Set by `review-started`, cleared on return |
| `decision` | `ApprovalDecision?` | The last decision made |
| `cancelReason` | `string?` | |
| `paidAt` | `string?` | |
| audit | `createdAt/By`, `updatedAt/By`, `version` | `version` drives optimistic concurrency (R5) |

There is deliberately **no `approvedAmount`**. Approval is all-or-nothing on the requested figure;
a wrong amount is corrected by returning the request, which puts the correction in the history
rather than applying it silently at approval (FR-030).

### `ExpenseAttachment`

| Field | Type | Notes |
|---|---|---|
| `id` | `AttachmentId` | |
| `requestId` | `ExpenseRequestId` | |
| `kind` | `AttachmentKind` | |
| `fileName` | `string` | |
| `mimeType` | `string` | Must be in the configured accepted set (FR-017) |
| `sizeBytes` | `number` | Must be at or under the configured maximum (FR-018) |
| `uploadAttempt` | `string` | Client-generated idempotency key (FR-020, R6) |
| `uploadedBy` | `ActorRef` | |
| `uploadedAt` | `string` | |

Bytes are not persisted by the mock; a session-scoped object URL backs preview only (R13).

### `ApprovalDecision`

| Field | Type | Notes |
|---|---|---|
| `decision` | `"approved" \| "rejected" \| "returned"` | |
| `note` | `string?` | Required for `rejected` and `returned` (FR-023) |
| `decidedAt` | `string` | |
| `decidedBy` | `ActorRef` | Names the actor, so a Super Admin override is visible (FR-022b) |

### `HistoryEntry` — append-only

| Field | Type | Notes |
|---|---|---|
| `id` | `HistoryEntryId` | |
| `requestId` | `ExpenseRequestId` | |
| `action` | `HistoryAction` | |
| `fromStatus` | `ExpenseStatus \| null` | `null` only for `created` |
| `toStatus` | `ExpenseStatus` | |
| `performedBy` | `ActorRef` | |
| `occurredAt` | `string` | |
| `sequence` | `number` | Monotonic tiebreak for identical timestamps |
| `note` | `string?` | |

No command accepts a `HistoryEntryId`; the service exposes no update or delete for history (R4).

### `ExpenseComment`

| Field | Type | Notes |
|---|---|---|
| `id` | `CommentId` | |
| `requestId` | `ExpenseRequestId` | |
| `body` | `string` | |
| `authorId` / `authorName` | `ActorRef` | |
| `createdAt` | `string` | |

Kept separate from history: history records transitions, comments record discussion (FR-037).
Nothing a commenter writes can dilute the audit record.

### `AccountingConfiguration`

Service-supplied, never hardcoded (FR-011, FR-017, FR-018; constitution III):

| Field | Type |
|---|---|
| `numbering` | `{ prefix, yearSegment, padding }` |
| `attachments` | `{ acceptedMimeTypes: string[], maxBytes: number }` |
| `currency` / `precision` | `string` / `number` |
| `branches` | `LookupOption[]` **read-only**, from Organization & Settings |

---

## Read-only references

| Entity | Source | Port |
|---|---|---|
| `BranchRef` | Organization & Settings | `OrganizationDirectoryReader.listBranches()` |
| `ActorRef` | Platform auth context | Supplied in `AccountingServiceContext` |

Accounting never imports another feature's fixtures, schemas, hooks, or components — only its
public exports, behind these two narrow ports.

---

## State transitions

The authoritative table, `expenseTransitionPolicy` in `utils/expense-lifecycle.ts`. Each cell is
`{ permission, reasonRequired }`.

| From | To | Permission | Note required |
|---|---|---|---|
| `draft` | `submitted` | `accounting.requests.submit` | no |
| `draft` | `cancelled` | `accounting.requests.cancel` | yes |
| `submitted` | `under-review` | `accounting.requests.review` | no |
| `submitted` | `cancelled` | `accounting.requests.cancel` | yes |
| `under-review` | `approved` | `accounting.requests.decide` | no |
| `under-review` | `rejected` | `accounting.requests.decide` | **yes** |
| `under-review` | `returned-for-revision` | `accounting.requests.decide` | **yes** |
| `under-review` | `cancelled` | `accounting.requests.cancel` | yes |
| `returned-for-revision` | `submitted` | `accounting.requests.submit` | no |
| `returned-for-revision` | `cancelled` | `accounting.requests.cancel` | yes |
| `approved` | `paid` | `accounting.requests.markPaid` | no |

`approved`, `rejected`, `paid`, and `cancelled` have no outgoing transitions — terminal by
construction, so "a paid request cannot be edited" needs no separate guard (SC-006, SC-007).

**Editability** is derived, not stored: `isEditable(status) === status === "draft" || status ===
"returned-for-revision"` (FR-013).

**Cancellation before approval only** falls out of the table having no `approved → cancelled` row.

---

## Derived values

Nothing below is stored; all are computed on read, so no second source of truth can drift (R9).

| Value | Derivation |
|---|---|
| `isEditable` | from status |
| `availableTransitions` | policy table row for the current status, filtered by the actor's permissions |
| `attachmentCount` | count of the request's attachments |
| Dashboard counts | the same filter-and-count path the equivalent list uses |
| Monthly total | sum of `amount` over requests whose `requestDate` falls in the month, in scope |
| By-branch / by-category breakdown | grouped sums over the same scoped, filtered set |

Dashboard figures are produced by the list path itself, so SC-005 holds by construction rather
than by two implementations agreeing.

---

## Validation rules

| Rule | Where | Requirement |
|---|---|---|
| Required: date, branch, category, description, amount | Zod schema, shared by form and service | FR-049 |
| `amount > 0`, well-formed decimal at the configured precision | `expense-schemas.ts` | FR-012 |
| Sub-category belongs to the chosen category | schema + service | FR-007, US4-4 |
| Chosen category and sub-category are active | service (a form cannot know a concurrent archive) | FR-006 |
| MIME type in the accepted set | schema + service | FR-017 |
| Size at or under the maximum | schema + service | FR-018 |
| Note present for `rejected` / `returned` | policy table drives the schema | FR-023 |
| Transition legal from the current status | policy table | FR-021 |
| Actor holds the transition's permission | policy table | FR-022 |
| `expectedVersion` matches | service | FR-028 |

One authoritative Zod schema per rule, used by both the form and the service — never two copies
that can disagree (constitution: forms and validation).

---

## Indexes

Lazy `Map`s rebuilt on demand and invalidated on every write (R11):

`requestById` · `requestsByBranch` · `requestsByStatus` · `attachmentsByRequest` ·
`historyByRequest` · `commentsByRequest` · `subCategoriesByCategory` · `categoryById`

`requestById` and `categoryById` exist specifically so no list ever calls `.find()` inside a
`filter` — the shape that made a Student Finance queue O(n²) at scale.

---

## Scope and tenancy

`AccountingServiceContext` is supplied outside every command payload, so a command cannot widen its
own scope:

```
organizationId · actor · permissions · authorizedBranchIds · organizationWide
currency · precision · now() · scopeFingerprint
```

Organization is checked **before** branch membership, so a matching branch id in another
organization is still refused. `scopeFingerprint` is the first segment of every query key (R8).
