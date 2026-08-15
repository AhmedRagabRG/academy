# Validation: US1 — Raise and Submit an Expense Request

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US1-1 a created request carries a unique number and names its requester | `request-creation.test.ts` — "carries a request number from the configured pattern", "names the acting user as requester" |
| US1-2 a Draft can be edited and stays a Draft | `request-editability.test.ts` — "allows editing a Draft" |
| US1-3 a complete Draft can be submitted | `request-submission.test.ts` — "moves it to Submitted" |
| US1-4 an incomplete or non-positive request is refused with its reason | "creation validates before it records" (6 cases) |
| US1-5 a Submitted request cannot be edited | "refuses editing a submitted request" — and every other non-editable status |

## Two defects the tests found

**Newly created requests collided with seeded ones.** `nextId` started at zero
while the fixtures already used `request-1` through `request-8`, so the first
request a user created took an id already in use — and inherited that record's
history and attachments. The counter is now seeded past every id in the store,
computed rather than hardcoded so it stays correct as fixtures grow.

Caught by "writes exactly one history entry, recording creation", which saw two.

**A refused creation burned a request number.** Not present in the final code, but
the test that pins it is: a gap in the numbering sequence reads as a deleted
record to anyone auditing later, which is exactly what a module claiming nothing
is ever deleted must not produce.

## Editability is derived, never stored

`isEditable(status)` is computed from the lifecycle table, and the projection's
`derived.isEditable` and `permissions.update` are computed from the same function
the service enforces. A test walks **all eight statuses** asserting the projection
and the enforcement agree.

The check order matters and is asserted: **editability before version**. Telling a
user their view is stale when the real problem is that the record is locked sends
them to refresh a page that will never help.

## Attachment idempotency

The idempotency key is checked **before** the version assert. A genuine retry
carries the version the client held before the first attempt succeeded, so
checking the version first would reject exactly the case the retry exists to
handle — a bug Student Management shipped and had to fix.

Asserted by uploading, then retrying with the *pre-upload* version as a real
client would: one attachment, and no version bump. Two genuinely different
attempts still produce two attachments, and deduplication is deliberately **not**
by file name and size, because two different receipts can share both.

## Validation happens before submission

Both the form and the service run the same Zod schema, so a rule cannot be
enforced in one and forgotten in the other. The `superRefine` is guarded, because
it still runs after a field check failed — parsing a malformed amount there would
throw instead of reporting.

Every refusal names its field: 15 schema cases plus 6 through the service, each
mapping to a specific error code rather than a generic failure.

## UI

`request-form.test.tsx` (14 cases):

- only **active** categories are offered; an archived one is not choosable on a
  new request, though it still displays on requests that use it
- sub-categories are offered only for the chosen parent, and none at all before a
  category is chosen
- changing the main category **clears** an inconsistent sub-category rather than
  leaving a stale one selected — the spec's named edge case. Leaving it would
  submit a combination the service refuses with no visible cause
- errors render as `role="alert"` wired by `aria-describedby`, with `aria-invalid`
  on the control
- a locked request disables every control

The create screen moves focus to the first invalid field on a refused submit, and
the cancel dialog **requires a real reason** — a confirm dialog with no input would
force a fabricated placeholder into an immutable record.

## Success criteria

- **SC-001** a complete request can be raised, documented, and submitted — PASS
- **SC-007** a Submitted, Under Review, Approved, Rejected, Paid, or Cancelled
  request cannot be edited — PASS, all six asserted
- **SC-011** every refusal names its field and reason, with no generic message — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build`, and the
Accounting suites (12 files, 163 tests) all pass.
