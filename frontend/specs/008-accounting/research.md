# Phase 0 Research: Accounting

**Feature**: 008-accounting | **Date**: 2026-08-01

Every decision below either resolves an open question in the plan's Technical Context or records a
lesson from features 005–007 that this module must not relearn. Nothing here is left as
NEEDS CLARIFICATION.

---

## R1 — The lifecycle is a policy table, not code paths

**Decision**: One table keyed `from → to`, each entry carrying `{ permission, reasonRequired }`,
in `utils/expense-lifecycle.ts`. The service evaluates a transition by looking it up; the UI
derives which actions to offer from the same table.

**Rationale**: Eight statuses with nine transitions and three distinct authorities produce a
combinatorial mess as `if` chains, and the UI inevitably drifts from the service. Student Finance
proved the table approach twice (`invoiceTransitionPolicy`, `refundTransitionPolicy`): its refunds
UI derives its buttons from the policy, so a policy change reaches the screen with no UI edit, and
a test can walk the whole table asserting that no approval step is satisfiable by the wrong key.

It also makes FR-022a structural rather than aspirational — the authority *is* a permission key,
because the table has nowhere to put a role.

**Alternatives considered**: Per-status `switch` in the service with matching conditionals in each
screen — rejected, this is the drift the table prevents. A general workflow engine — rejected as
far more machinery than one fixed nine-transition workflow needs.

---

## R2 — Entering review is an explicit act, never a side effect of reading

**Decision**: `startReview` is its own command. Opening a request's detail page does **not** change
its status. The UI shows a "بدء المراجعة" action to a user holding review authority on a Submitted
request.

**Rationale**: The alternative — flipping Submitted → Under Review when a reviewer opens the page —
means a GET mutates state. An executive glancing at a request would silently claim it, the history
would fill with entries nobody performed deliberately, and the "who is reviewing this" signal the
status exists to carry would become noise. A read must not have side effects.

**Alternatives considered**: Automatic on open (rejected as above). Skipping Under Review entirely
and going Submitted → decided (rejected — the spec lists it, and it answers a real operational
question). A separate "claimed by" field alongside the status (rejected as redundant with a status
the spec already defines).

---

## R3 — Money reuses the shared module unchanged

**Decision**: `@/shared/utils/money` for every amount: decimal strings with integer minor-unit
arithmetic, `makeMoney`/`compare`/`isPositive`/`formatMoney`. Amount entry uses the shared
`currency-field`, which folds Arabic-Indic digits and emits a decimal string, never a number.

**Rationale**: The module already exists, is proven across Student Finance, and refuses to let a
float touch a money value. Accounting's arithmetic needs are lighter than Finance's — sums for
dashboard totals, comparisons for validation — and none of it justifies a second implementation.

Feature 007 shipped a duplicate money helper in Student Management that computed minor units as
`Number(amount) * 10 ** precision` — float multiplication on money — and it was deleted during that
feature's polish. Accounting starts on the shared module so that never happens again.

**Alternatives considered**: A local money helper (rejected — this is precisely the duplication
already removed once). A decimal library dependency (rejected — the shared module covers the need
and the constitution's approved-stack list does not include one).

---

## R4 — History immutability is structural, not promised

**Decision**: Three mechanisms together:

1. A single private `appendHistory()` inside the service is the only writer, called in the same
   operation as the transition it records — never as a separate step that could be skipped or fail
   independently.
2. The service exposes no update or delete for history, and no operation takes a history id.
3. Every projection is returned through `structuredClone`, so a caller mutating what it received
   cannot reach the store.

**Rationale**: "History is immutable" as a rule in a document is worth nothing; the question is
what makes violating it impossible. Student Finance's timeline used exactly this shape, and its
contract suite asserts one event per successful command and none per refused one across every
command — an assertion only possible because the write is co-located with the transition.

**Alternatives considered**: Deep-freezing entries (rejected — it prevents mutation of the returned
copy but says nothing about the store, and interacts badly with `structuredClone`). Writing history
from a wrapper around commands (rejected — a wrapper cannot know the previous status, which the
entry must carry).

---

## R5 — Optimistic concurrency on every command, checked after authority

**Decision**: Every command carries `expectedVersion`. The service checks, in this order:
permission → scope → transition legality → version → field validation. A stale version yields
`version-conflict`.

**Rationale**: SC-008 requires that two simultaneous decisions produce exactly one winner and one
reported conflict. Version checking is the mechanism.

The ordering matters and is a direct lesson from Student Finance: when the version assert ran
before the permission check, an unauthorized user received a version conflict — which tells them
the record exists, implies they could otherwise act on it, and sends them to refresh a page that
was never going to work. Authority first, then concurrency.

**Alternatives considered**: Last-write-wins (rejected — SC-008 forbids it, and silently
overwriting a colleague's approval is the worst possible failure here). Locking (rejected as
disproportionate, and it needs a lock lifetime nobody has specified).

---

## R6 — Attachment idempotency is checked before the version assert

**Decision**: `uploadAttachment` carries a client-generated `uploadAttempt` key. The service looks
that key up **before** asserting the version; a repeat of an attempt that already succeeded returns
the existing attachment rather than creating a second one.

**Rationale**: This is a bug Student Management shipped and had to fix. A genuine retry carries the
version the client held *before* the first attempt succeeded, so checking the version first
rejects every retry as a conflict — exactly the case the retry exists to handle. Checking the
idempotency key first makes a retry a no-op and a genuine concurrent edit still a conflict.

**Alternatives considered**: Deduplicating by file name and size (rejected — two genuinely
different receipts can share both). No idempotency (rejected — FR-020 requires it, and a duplicated
invoice on an expense request is a real accounting problem).

---

## R7 — Archived categories stay resolvable, and sub-category consistency is enforced on write

**Decision**: Two distinct reads. `listCategories({ activeOnly: true })` feeds pickers;
`resolveCategory(id)` feeds display and returns archived ones. On write, the service rejects a
sub-category that does not belong to the submitted main category; in the form, changing the main
category clears an inconsistent sub-category rather than leaving a stale one selected.

**Rationale**: FR-006 requires both halves — an archived category must disappear from choices while
remaining visible on requests that already reference it. A single "list categories" read cannot
serve both, and using the filtered list for display would render historical requests with a blank
category, silently rewriting the past.

The consistency rule closes the spec's edge case where a sub-category is chosen and the parent is
then changed.

**Alternatives considered**: Hiding archived categories everywhere (rejected — it corrupts the
display of historical requests). Cascading an archive into requests (rejected — requests are
immutable records of what was decided).

---

## R8 — Branch scope comes from context and keys every cache entry

**Decision**: An `AccountingServiceContext` supplied outside every command payload, carrying the
actor, organization, permissions, authorized branches, organization-wide flag, currency, precision,
an injected clock, and a scope fingerprint. Organization is checked before branch membership. The
fingerprint is the first segment of every query key.

**Rationale**: A command must not be able to widen its own scope, so scope cannot be a parameter.
The fingerprint in the key is what stops two users with different scopes sharing a cached result —
without it, a branch manager could be served an executive's cached list.

Checking organization before branch matters: a branch id that happens to match in another
organization must still be refused.

**Alternatives considered**: Filtering in the UI (rejected — a filter is not enforcement). A single
global cache key (rejected — cross-scope leakage).

---

## R9 — Dashboard figures are derived from the same reads the lists use

**Decision**: Each dashboard figure is produced by the same filter-and-count path that serves the
equivalent list, with the same scope and the same filters. No separate aggregation code.

**Rationale**: SC-005 requires every dashboard figure to equal what the equivalent filtered list
reports. Two code paths computing the same number will disagree eventually — and a dashboard that
disagrees with the list beneath it destroys trust in both. Student Finance's derived-never-stored
balances are the same principle: one source, computed on demand.

An empty organization reports "no records" rather than zeroes, because a zero that means "none
exist" and a zero that means "none match" are different facts (FR-045).

**Alternatives considered**: Precomputed counters maintained on write (rejected — a second source
of truth that drifts, and the volume does not need it). Separate aggregate queries (rejected — same
divergence risk without the performance justification).

---

## R10 — The shared table gains named bulk actions

**Decision**: Extend the shared `DataTable` with an optional `bulkActions: { id, label, run }[]`
prop rendering one button per action, alongside the existing `onBulkAction`. Accounting supplies
submit-selected and decide-selected, each gated by its own permission.

**Rationale**: The plan calls for bulk actions and the shared table already owns row-selection
state. Its current surface renders one button labelled "إجراء جماعي (n)" — with two possible
actions, that label cannot say which is about to run, and on a financial approval queue an
ambiguous bulk button is a genuine hazard.

Building a bespoke toolbar inside Accounting would duplicate selection state and introduce a second
bulk-action pattern. The extension is additive; every existing caller keeps working untouched.

**Alternatives considered**: Reusing the single callback and disambiguating in a follow-up dialog
(rejected — the user should know what they are triggering before they trigger it). A feature-local
table (rejected — the constitution mandates the single shared table).

---

## R11 — Indexes and sort keys from the first commit

**Decision**: Per-entity lazy `Map` indexes invalidated on every write, including a by-id index for
single lookups. Sort keys computed once per row (decorate-sort-undecorate), never derived inside a
comparator.

**Rationale**: Both are direct lessons from Student Finance's 50,000-record measurement. Joining
each payment to its invoice with `store.invoices.find(...)` inside a `filter` made that queue
O(payments × invoices) — 9.5 s per call against a 2 s budget. Deriving a balance inside a sort
comparator cost `2·n·log n` derivations — 2.3 s to sort by amount.

Neither was visible at fixture scale. Accounting has the same shape (requests joined to categories,
branches, and requesters; sortable by amount and date), so both patterns are adopted up front
rather than retrofitted after a measurement fails.

**Alternatives considered**: Adding indexes when a measurement fails (rejected — that is what
happened last time, and the fix was more expensive than the prevention).

---

## R12 — Date-range and paging helpers move to the shared layer

**Decision**: Promote `isWithinRange`, `clampPage`, and `normalizeSearchTerm` to
`shared/utils/list-query.ts`. Student Finance re-exports them from there, keeping its public
surface and its tests unchanged.

**Rationale**: A date-only upper bound names a **day**, not the instant of its midnight. Comparing
an invoice issued at 09:00 against a `to` of that same date excluded it — an off-by-one that
silently dropped rows from the last day of every range, found by contract test in feature 007.

Accounting needs identical semantics for request-date filtering. A second independent copy is a
second place for that bug to return. Two features is the constitution's "genuinely cross-feature"
threshold.

**Alternatives considered**: Accounting importing from `features/student-finance/utils/` (rejected —
a cross-feature import into another module's internals, which the module-boundary principle
forbids). Duplicating the logic (rejected as above).

---

## R13 — Attachments are metadata during frontend development

**Decision**: An attachment record carries kind, file name, MIME type, size in bytes, uploader, and
upload time. The file's bytes are held only as an in-memory object URL for preview within the
session and are explicitly not persisted by the mock.

**Rationale**: Where bytes live is a backend concern the spec places out of scope. Modelling the
metadata fully means the UI, validation, and history are all real; only storage is deferred, and
the service interface does not change when it arrives.

Type and size validation runs against the configured accepted types and maximum, so both are
configuration rather than constants in a component.

**Alternatives considered**: Base64 in the mock store (rejected — it would make fixtures enormous
and model nothing the real system will do). Skipping attachment records entirely (rejected —
FR-016 through FR-020 are testable requirements).

---

## R14 — RTL, bidi isolation, and per-code error copy

**Decision**: Every amount, request number, date, and file size renders inside `<bdi dir="ltr">`.
Every `AccountingErrorCode` has its own Arabic message with **no generic fallback**.

**Rationale**: Money and identifiers are mixed-direction values inside Arabic text; without
isolation the surrounding text reorders their digits, which silently changes a displayed figure.

The no-fallback rule is what forces each refusal to say something useful. Student Finance's
`reduction-below-collected` message points the user at the refund flow rather than saying
"invalid" — that pointer is the difference between a refusal a user can act on and one they can
only retry. Accounting's refusals must do the same: a rejected transition names why it is not
available from the current status.

**Alternatives considered**: A generic fallback message (rejected — it is exactly the "something
went wrong" that a per-code table exists to eliminate). Relying on the browser's bidi algorithm
(rejected — it is what produces the reordering).

---

## Summary of lessons carried forward

| From | Lesson | Applied here |
|---|---|---|
| 006 | Upload retry rejected as a conflict | R6 — idempotency before version |
| 006 | O(n²) list filtering | R11 — indexes from the first commit |
| 007 | Float math in a duplicated money helper | R3 — shared money module only |
| 007 | Date-only upper bound dropped its own day | R12 — promote the fixed helper, don't copy it |
| 007 | Version checked before permission leaked existence | R5 — authority first |
| 007 | Balance derived inside a sort comparator | R11 — sort keys computed once |
| 007 | A field accepted and never checked | R5 — `expectedVersion` is asserted, not decorative |
