# Validation: Future Readiness

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS

## Backend replacement (T175)

Every read and command goes through `AccountingService`, a plain interface. The
mock implements it; nothing in the UI imports the mock's internals. Replacing it
means providing a second implementation — no screen, hook, form, or component
changes.

The interface is already shaped for a network boundary: every read takes an
optional `AbortSignal`, every command carries `expectedVersion`, and every result
is a projection rather than a live entity. Errors are a closed union of 17 stable
codes, so a backend maps its own failures onto them without the UI parsing prose.

## Module boundary

- `grep` confirms **no import in either direction** between Accounting and Student
  Finance.
- Accounting's only cross-feature import is `@/features/organization-settings`,
  through one adapter file, over that module's public exports.
- Nothing imports Accounting internals except the route segments and
  `foundation-navigation.ts`, which uses the deep `config/navigation` path — the
  same convention every other feature follows, and deliberately not the barrel,
  since importing the barrel would pull every screen into the navigation module.

## Tenancy

Organization and branch scope live in `AccountingServiceContext`, supplied outside
every command payload — a command cannot widen its own scope. Organization is
checked **before** branch membership, so a matching branch id in another
organization is still refused. The scope fingerprint keys every cache entry.

## Audit

Every state-changing command appends exactly one history entry carrying its
actor, time, action, both statuses, and note — inside the same operation as the
transition. Verified for all eight commands, and verified to write nothing for
eight kinds of refusal.

Nothing is deleted: cancellation and rejection are recorded states, and the
service exposes no delete operation at all (asserted by enumerating its surface).
`removeAttachment` is the only removal and is legal only while the request is
editable.

## Workflow

Approvals are already data, not code paths: `expenseTransitionPolicy` is a table
of `{ permission, reasonRequired }` keyed by from-state and to-state. The decision
panel derives its actions from that table rather than hardcoding per status, so
adding a workflow step is a change to the table plus its tests.

Six distinct authorities — submit, review, decide, mark-paid, cancel,
manage-categories — none implied by another. That separation is what makes a
future multi-level approval chain expressible, and it is what lets Executive
Manager hold every read key and no decision key.

## Reporting and audit hand-off

`getAccountingExportContext` returns settled facts and identities only: ten fields
per request, asserted by comparing the **whole key set**, so adding a field fails
the test rather than leaking. Two further cases serialize the payload and assert
no requester name or description appears anywhere in it.

## AI

Nothing here makes an AI feature harder to add, and nothing pretends to be one:

- statuses, actions, actors, and amounts are typed and structured rather than prose
- money is decimal strings with integer arithmetic, so a figure quoted by a model
  and a figure computed by the system are the same string
- the transition policy is a readable table, so an explanation generated from it
  cannot disagree with what the service will do

No speculative AI hooks or prompt scaffolding were added. The spec listed AI
Automation as out of scope, and it is.
