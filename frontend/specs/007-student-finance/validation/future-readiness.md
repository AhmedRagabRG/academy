# Validation: Future Readiness

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Backend replacement (T192)

Every read and command goes through `StudentFinanceService`, a plain interface in
`services/student-finance-service.ts`. The mock implements it; nothing in the UI
imports the mock's internals. Replacing it means providing a second implementation
of the same interface — no screen, hook, form, or component changes.

The interface is already shaped for a network boundary: every read takes an
optional `AbortSignal`, every command carries `expectedVersion` for optimistic
concurrency, and every result is a projection rather than a live entity.

Errors are a closed union of stable codes (`FinanceErrorCode`), not messages, so a
backend can map its own failures onto them without the UI parsing prose.

## Tenancy

Organization and branch scope live in `FinanceServiceContext`, supplied outside
every command payload — a command can never widen its own scope. Organization
isolation is checked before branch membership on every record, and the scope
fingerprint keys every cache entry, so two tenants cannot share a cached result.

## Audit

Every state-changing command appends exactly one timeline event carrying its
actor, time, category, subject reference, and amount, inside the same operation —
verified for all nine commands, and verified to write nothing for eight kinds of
refusal.

Invoices additionally carry `statusHistory` with the actor and time of each
transition, and `createdBy`/`updatedBy`/`version`. Nothing is ever deleted:
cancellation, rejection, and refund are all recorded states, and the service
exposes no delete operation at all (asserted by enumerating its surface).

## Workflow

Approvals are already modelled as data, not as code paths: `refundTransitionPolicy`
and `invoiceTransitionPolicy` are tables of `{ permission, reasonRequired }` keyed
by from-state and to-state. The refunds UI derives its available actions from that
table rather than hardcoding them per status, so adding a workflow step is a change
to the table plus its tests.

Discount, scholarship, and refund approval are three distinct permissions, none
implied by the permission to record a payment — which is what makes a future
multi-step approval chain expressible.

## Accounting

`getAccountingContext` is the hand-off: settled facts and identities only, with an
exact field set asserted by test so an added field fails rather than leaking. It
carries currency, precision, and an as-of time, and obeys the same permission and
scope rules as every interactive read.

## AI

Nothing in this module makes an AI feature harder to add later, and nothing
pretends to be one:

- balances are **derived, never stored**, so an assistant reading them cannot read
  a stale figure that disagrees with the records
- money is decimal strings with integer arithmetic, so a figure quoted by a model
  and a figure computed by the system are the same string
- every event carries a category, an actor, a time, and an amount — a structured
  history rather than prose to be parsed
- the reduction order is one function used by the preview, the schemas, and the
  service, so an explanation generated from it cannot disagree with the result

No speculative AI hooks, prompt scaffolding, or model configuration were added.
The spec listed AI Automation as out of scope, and it is.
