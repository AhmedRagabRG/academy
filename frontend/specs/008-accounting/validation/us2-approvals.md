# Validation: US2 — Review, Approve, Reject, or Return a Request

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US2-1 an authorized reviewer opens a request for decision and is recorded | `review-start.test.ts` — "records who is reviewing it" |
| US2-2 approval records decision, author, time, and notes | `request-decisions.test.ts` — "records the decision, its note, its time, and its author" |
| US2-3 rejection requires a reason and makes the request read-only | `decision-notes.test.ts`; "rejects with a reason and makes the request read-only" |
| US2-4 return requires a note and makes the request editable again | "returns for revision and makes the request editable again" |
| US2-5 a returned request can be edited and resubmitted, both in the history | `return-resubmit.test.ts` — "shows the return and the resubmission as separate history entries" |
| US2-6 a user without review authority is refused and nothing is recorded | `decision-permissions.test.ts`, `oversight-without-authority.test.ts` |

## Reading never changes anything

Research R2 in practice. The tempting implementation flips the status when a
reviewer opens the detail page, which makes a GET mutate state: an executive
glancing at a request would silently claim it, and the history would fill with
entries nobody performed deliberately.

`startReview` is its own command. Asserted by reading a Submitted request five
times and confirming its status, version, reviewer, and history are all unchanged.

## The refusal ordering, and the defect it exposed

The first implementation checked transition legality before the version. Two
reviewers racing therefore produced `invalid-transition` for the loser — truthful,
but useless: it says the action was never available, when in fact **someone else
had just decided**.

The rule is now:

1. Look up the transition. **If it does not exist**, check the version first — a
   stale view is the real explanation, and saying so is what tells the second
   reviewer to refresh.
2. If it does exist: **authority, then concurrency, then the note.** A user who
   may not act is told exactly that, never handed a version conflict implying they
   otherwise could — asserted by "reports forbidden rather than a version
   conflict" with a deliberately absurd version.

## SC-008: exactly one winner

Two simultaneous decisions produce **1 fulfilled, 1 conflict, and nothing else** —
asserted on the outcome shape, not just on the absence of a throw. Also verified:

- the request ends in exactly one decided state
- **one** history entry, not one per attempt — a history recording attempts is not
  a record of what happened
- the version advances exactly once
- the same holds with **five** reviewers racing at once (1 fulfilled, 4 conflicts)
- two racing `startReview` calls likewise yield one winner

## Authority is genuinely separate

`decision-permissions.test.ts` grants each of **ten** neighbouring permissions in
turn — create, update, submit, review, markPaid, cancel, attachments, comments,
categories.manage, export — and asserts the decision is still refused for every
one. One case goes further: a user who successfully *starts a review* is then
refused the decision, so the separation is demonstrated on someone who
demonstrably holds real authority over the same request.

## Oversight without participation

Executive Manager was resolved with the author as read-everything, decide-nothing.
`oversight-without-authority.test.ts` asserts that a user holding exactly
`oversightPermissions`:

- reads every request, its full history, and the lookups
- is offered **zero** transitions on every status
- reports every acting permission as `false`
- is refused on decide, start-review, and cancel when attempting them directly
- changes nothing across a whole session of attempts

Two cases assert the **permission set itself**, so adding a decision key to the
oversight role fails here rather than silently widening what an Executive Manager
can do.

## The correction loop

`return-resubmit.test.ts` walks return → correct → resubmit → review → approve and
asserts the approved figure is the corrected one, with
`expect("approvedAmount" in approved).toBe(false)` — the all-or-nothing rule is
enforced by the model having nowhere to put a second figure.

The full history reads:
`created · submitted · review-started · returned · resubmitted · review-started · approved`

A resubmission is its own action, never a repeat of `submitted`, and a request
returned twice keeps **both** notes.

## UI

`decision-panel.test.tsx` (14 cases). The panel derives its actions from
`derived.availableTransitions` rather than hardcoding per status, so the buttons
shown are provably the same set the service accepts. A terminal request says
"no actions available" instead of rendering an empty panel. Whether a note is
required is passed in from the policy table, so the dialog and the service cannot
disagree about it.

## Success criteria

- **SC-002** a reviewer can decide a request in one interaction — PASS
- **SC-003** exactly one history entry per completed transition — PASS
- **SC-008** two simultaneous decisions yield exactly one winner — PASS
- **SC-011** every refusal names its reason — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build`, and the
Accounting suites (17 files, 232 tests) all pass.
