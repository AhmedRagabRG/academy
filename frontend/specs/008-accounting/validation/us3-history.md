# Validation: US3 — Read a Request's Full History

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US3-1 every transition appears chronologically with action, statuses, actor, time, and note | `history-shape.test.ts` — "names the action, both statuses, the actor, and the time" |
| US3-2 no edit or deletion of an entry is possible | `history-immutability.test.ts` — the whole file |
| US3-3 a refused action writes no entry | `history-on-refusal.test.ts` — 8 kinds of refusal |

## One entry per success — every command

`history-per-command.test.ts` covers **all eight** transition commands: create,
submit, start-review, approve, reject, return, resubmit, cancel. Each asserts both
the count and the action name.

It also asserts what must **not** write an entry: editing a draft, uploading an
attachment, adding a comment, and reading. An edit is not a transition; recording
one would turn the history into a diary and bury the decisions among the
keystrokes.

A full lifecycle produces exactly:
`created · submitted · review-started · returned · resubmitted · review-started · approved`

## None per refusal — every kind

The harder half to keep true, because each refusal takes a different path through
the guards. All eight are covered: a stale version, a missing permission, an
out-of-scope branch, an illegal transition, a missing note, a decision on an
unclaimed request, an invalid field, and a cancellation with no reason.

A run of **eight consecutive refused commands** leaves the history byte-identical.

## Immutability is structural, not promised

Three mechanisms, each asserted rather than assumed:

1. **No operation exists.** The test enumerates the service surface and asserts no
   name matches delete/destroy/purge/erase, that `listHistory` is the only
   operation naming history, and that `removeAttachment` is the only removal at
   all — itself legal only while the request is editable.
2. **Written where the transition happens.** One private `appendHistory` is the
   sole writer, called inside the same operation as the transition it records.
3. **Deep-cloned on the way out.** Four cases mutate what a caller received —
   pushing, popping, splicing, and rewriting an entry's action, note, and actor
   name — and re-read to confirm the store is untouched. Every read returns a
   fresh array and fresh objects, so "immutable" is not merely a convention.

Two further cases assert history only ever **grows**, and that the creating entry
is byte-identical after three later transitions.

## The chain is unbroken

`fromStatus` is `null` only on the creating entry, never on any later one. Each
entry's `fromStatus` equals the previous entry's `toStatus`, and the last entry's
`toStatus` equals the request's current status — so a transition cannot have
happened without being recorded. Sequences are distinct and strictly increasing.

## UI

`request-timeline.test.tsx` (19 cases):

- every entry states **both ends** of its transition — "returned" alone does not
  say what it was returned *from*, and a reader reconstructing a disputed
  sequence needs both
- all nine actions have a label, an icon, and a tone; labels come from the single
  copy module rather than a second map that would drift
- a resubmission is visibly distinct from a first submission
- oldest first, in an `<ol>`, so sequence is structural rather than visual
- the immutability notice is shown, because a history is only worth reading if
  the reader knows it cannot have changed
- **no control exists that could edit or remove an entry** — asserted by there
  being no button in the timeline at all
- an unparseable time renders as `—`, never `Invalid Date`

Comments render in their own panel with a notice stating they are not part of the
approval record, so nothing written there is mistaken for part of the audit trail.

## Success criteria

- **SC-003** exactly one entry per completed transition and none per refusal, in
  100% of tested workflows — PASS
- **SC-004** no history entry can be altered or removed through any available
  action — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build`, and the
Accounting suites (25 files, 331 tests) all pass.
