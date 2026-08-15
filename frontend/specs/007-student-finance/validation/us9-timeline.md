# Validation: US9 — Review the Financial Timeline

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US9-1 every financial operation appears in chronological order with actor and time | `finance-timeline-events.test.ts` — "every event is attributable and ordered" |
| US9-2 exactly one event per successful command | "exactly one event per successful command" — 9 commands |
| US9-3 no event at all per refused command | "no event at all per refused command" — 8 refusals |
| US9-4 the history pages incrementally without repeating or skipping | `finance-timeline.test.ts` — "paging" |
| US9-5 events can be filtered by category | "category filtering" |
| US9-6 viewing the timeline requires its own permission | "requires the timeline permission" |

## One event per success, none per refusal

Both halves matter equally. A timeline that records attempts is not a record of
what happened, and a command that succeeds without an event leaves a gap nobody
can reconstruct later.

**Every command is covered**, each asserting both the count and the category:
issue, cancel, generate plan, record payment, discount before issuance
(`discount-applied`), discount after issuance (`adjustment-recorded`), award
scholarship, request refund, complete refund.

A scholarship award writes **one** event however many invoices it touches — the
award is the decision, and one decision is one entry.

**Every kind of refusal is covered**: a stale version, a missing reason, a payment
above the balance, a discount above the limit, an ineligible installment plan, a
refund above the payment, a missing permission, and an out-of-scope record. None
of them writes anything.

## Ordering and stable paging

Newest first, with `sequence` breaking ties on identical timestamps — which is not
a hypothetical, because the injected clock gives every event in a test the same
instant.

Paging is keyset over `(occurredAt, sequence)`, not offset. Two cases pin why:

- appending a **newer** event mid-paging does not shift the second page
- appending an event at the **same instant as the cursor** does not shift it either

and a walk through the whole set one row at a time returns every event exactly
once, in order, with no duplicates.

A malformed cursor is ignored rather than silently returning nothing, an absurd
limit is clamped to 100, and a zero or negative limit yields one row rather than
an empty page.

## A fixture that dated a record in the future

The draft invoice's creation event was dated by its **due** date — 2026-10-01,
two months after the injected clock — so a draft appeared to have been created
after "now" and sorted above every real event. Fixed by dating a draft's creation
explicitly; an invoice cannot have been created in the future.

## UI

`finance-timeline.test.tsx` (12 cases):

- categories are shown as Arabic labels, never raw keys, and the labels come from
  the single copy module rather than a second map that would drift
- an event carries its **amount** where it has one — a financial timeline without
  figures makes the reader open every record to learn anything
- every one of the ten categories has a label, an icon, and a tone; tone is
  decorative, so no event is distinguishable by colour alone
- the load-more control appears only while more remain, and appending a page adds
  rows below without reordering what was already read
- the list is an `<ol>`, so order is conveyed structurally rather than visually
- an unparseable timestamp renders as `—` rather than `Invalid Date`

The section is mounted in the student's financial workspace with a category
filter, empty states that distinguish "no events" from "none of this type", and
retryable error and permission states.

## Success criteria

- **SC-012** exactly one timeline event per successful command and none per
  refused command, across every command — PASS
- **SC-014** paging is stable under concurrent appends — PASS

## Gates

`npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test`
(141 files, 1,051 tests excluding the scale suite) all pass.
