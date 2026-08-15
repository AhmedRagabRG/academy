# Validation: US5 — Mark an Approved Request as Paid

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US5-1 an Approved request becomes Paid, with the action, actor, and time recorded | `mark-paid.test.ts` — "moves it to Paid", "writes exactly one history entry naming the transition" |
| US5-2 any other status is refused | "no other status can be marked paid" — all seven |
| US5-3 a Paid request accepts no further change | `paid-immutability.test.ts` — seven routes in, all closed |

## SC-006: only Approved can be paid

Asserted against **all seven** other statuses, each checking the refusal names the
status it came from and the one it was refused: `invalid-transition` with
`{ from, to }`, so the message can say why rather than only that.

Paying twice is refused for the same reason — after the first, the status is
`paid`, which has no outgoing row.

## SC-007: Paid is terminal by construction

The transition table has **no outgoing row** from `paid`, so "cannot be edited"
needs no separate guard. Seven routes in are individually closed: edit, submit,
decide, cancel, start-review, add attachment, remove attachment.

After three refused attempts in a row the request is byte-identical — same status,
amount, version, and history length — and it offers no transitions and no acting
permissions at all.

Terminal means unchangeable, **not invisible**: reading it and its history still
works, because auditing depends on that. Commenting still works too, since a
comment is discussion rather than a change to the record.

## FR-027: paying is a distinct authority from approving

Taking the decision and releasing the funds are different jobs.
`mark-paid-permission.test.ts` grants each of **nine** neighbouring permissions in
turn — including, especially, `requests.decide` — and asserts the payment is still
refused for every one.

One case goes further: the same user **successfully approves** a request and is
then refused the payment on it. The separation is demonstrated on someone who
demonstrably holds real authority over that request, not on a user with nothing.

The projection agrees with the enforcement: `permissions.markPaid` is false
without the key, false on a status that cannot be paid even *with* the key, and
`availableTransitions` is `["paid"]` only when both the status and the key allow it.

## One amount, for the request's whole life

`markPaid` asserts the amount is unchanged and that neither `approvedAmount` nor
`paidAmount` exists on the projection. Your all-or-nothing rule holds because the
model has nowhere to put a second figure — not because a validation forbids one.

## Concurrency

Two racing `markPaid` calls yield exactly one success, and the history contains
exactly **one** `paid` entry. A second payment record on the same request would be
a real accounting problem, not merely a duplicate row.

## UI

`mark-paid-action.test.tsx` (9 cases). The action appears only on an Approved
request for a user holding the key — derived from `availableTransitions`, so an
Approved request with an empty list means the key is absent and the button is
simply not there.

The confirmation states that **the transfer happens outside this module**. Someone
clicking it must not believe they are releasing funds; this records a payment that
already happened, for reporting and audit. The dialog focuses its confirm button
on open and returns focus on close.

## Success criteria

- **SC-006** a request that is not Approved cannot be marked Paid, in 100% of
  attempts — PASS
- **SC-007** a Paid request cannot be edited, in 100% of attempts — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build`, and the
Accounting suites (34 files, 453 tests) all pass.
