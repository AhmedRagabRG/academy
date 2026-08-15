# Quickstart: Accounting

**Feature**: 008-accounting | **Date**: 2026-08-01

Runnable scenarios that prove the module works end to end. Each names what to do and what must be
true afterwards. Implementation details live in `tasks.md`; contracts live in
[contracts/accounting-contracts.md](./contracts/accounting-contracts.md).

## Prerequisites

```bash
npm install
npm run dev -w web        # http://localhost:3000
```

Sign in with the mock account, then open `/accounting`. Seeded data covers three branches, six
categories with sub-categories, and requests in every status.

## Gates

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npm run test:e2e -w web
```

---

## S1 — Raise, attach, submit (US1)

1. `/accounting/expense-requests/create` — enter a date, branch, category, description, and amount.
2. Save as draft. Reopen it; every field is as entered.
3. Attach a PDF invoice, then attempt a `.docx`.
4. Submit.

**Expect**: the draft carries a unique request number and names you as requester. The `.docx` is
refused with a message naming the accepted types; the PDF appears with its size. After submitting,
the status is Submitted and the form is no longer editable.

**Refusals to check**: an amount of `0` or `-5`; a missing category; a file over the configured
maximum. Each names the field and reason, and focus moves to the first failing field.

---

## S2 — Review and decide (US2)

1. As a Finance Manager, open a Submitted request and choose **بدء المراجعة**.
2. On a second request, approve. On a third, reject without a note, then with one. On a fourth,
   return for revision with a note.

**Expect**: opening the detail page alone changes nothing — only the explicit action moves it to
Under Review, and it records you as reviewer. Approval needs no note; rejection and return each
refuse an empty note. A rejected request becomes read-only; a returned one becomes editable again.

---

## S3 — Return, correct, resubmit (US2, FR-030)

1. Return a request asking for a corrected amount.
2. As the branch, edit the amount and resubmit.
3. Approve it.

**Expect**: the approved request's amount equals the corrected figure, and the history shows the
return, the resubmission, and the approval as separate entries. **There is no second "approved
amount" anywhere** — the correction is visible in the history rather than applied silently at
approval.

---

## S4 — History is append-only (US3)

1. Drive one request through create → submit → review → return → resubmit → review → approve → paid.
2. Read its history.

**Expect**: exactly one entry per transition, newest at the appropriate end, each carrying the
action, previous status, new status, actor, time, and note. No interface offers to edit or delete
an entry.

**Then**: attempt an action that will be refused — submit with a missing field, or decide with a
stale version. **No history entry is written for it.**

---

## S5 — Authority is separate (FR-022, FR-027)

1. As an Executive Manager, open a Submitted request.
2. As a Finance Manager, approve a request, then mark it paid.
3. As a Super Admin, approve a different request.

**Expect**: the Executive Manager sees everything — the request, the history, the dashboard — and
is offered no decision action; attempting one directly is refused. Marking paid is refused for a
user holding `decide` but not `markPaid`. The Super Admin's approval appears in the history
**named as theirs**, so an override is visible rather than indistinguishable from Finance's.

---

## S6 — Only approved can be paid (US5, SC-006)

Attempt to mark a Draft, Submitted, Under Review, Returned, Rejected, and Cancelled request as
paid.

**Expect**: every one refused, each saying why it is unavailable from that status. Only the
Approved one succeeds, and once Paid it accepts no further change.

---

## S7 — Categories archive without rewriting the past (US4)

1. Create a category and a sub-category under it.
2. Raise a request using them.
3. Archive the category.

**Expect**: the archived category disappears from the pickers on a new request, its sub-categories
disappear with it, **and the request raised in step 2 still displays both**. Reactivating restores
them to the pickers.

**Also**: on the create form, choosing a sub-category then changing the main category clears the
now-inconsistent sub-category rather than leaving it selected.

---

## S8 — Discovery (US6)

1. Filter by branch, then add category, then add status, then add a date range.
2. Set the range to a single day on which a request exists.
3. Set a `from` later than its `to`.
4. Filter down to nothing.

**Expect**: filters compose. The single-day range includes a request recorded at any time that day
— both ends inclusive. The inverted range is reported in the control rather than silently
returning nothing. The empty result says no request matched and offers to clear the filters,
distinct from an organization with no requests at all.

---

## S9 — Bulk actions (plan: Tables)

Select several Draft requests and submit them together; select several Submitted ones and approve
them together.

**Expect**: each bulk action is a **named** button saying what it will do — not one generic
button. An action is offered only to a user holding its permission, and a row that cannot take the
action is reported individually rather than failing the whole batch silently.

---

## S10 — Dashboard equals the lists (US7, SC-005)

1. Open `/accounting` and note each count.
2. Open the requests queue and filter to each status in turn.

**Expect**: every dashboard figure equals the total the equivalent filtered list reports. Repeat
as a branch-scoped user: both the dashboard and the lists narrow together. With no records at all,
the dashboard says so rather than showing zeroes.

---

## S11 — Scope (SC-010)

As a user authorized for one branch, list requests, open one from another branch by URL, and read
the dashboard.

**Expect**: the list shows only that branch; the direct URL is refused as **forbidden, not empty**;
the dashboard covers only that branch. Export obeys the same scope.

---

## S12 — Concurrency (SC-008)

Open the same Submitted request in two tabs. Approve in the first; reject in the second.

**Expect**: exactly one decision takes effect. The second is refused as a conflict telling the
reader the request has moved on — never silently overwriting the first — and writes no history
entry.

---

## S13 — Attachment retry (FR-020)

Upload an attachment, then retry the same upload attempt.

**Expect**: one attachment, not two. A genuinely different file uploaded concurrently still
conflicts normally.

---

## S14 — RTL, responsive, accessibility (SC-012, SC-013)

Walk every route at 1440, 1280, and 834 px.

**Expect**: `dir="rtl"`; no horizontal page scrolling at any width; amounts, request numbers,
dates, and file sizes direction-isolated so their digits never reorder. Every action reachable by
keyboard; dialogs take focus on open and return it on close; a refused submit moves focus to the
first invalid field; status is readable as text, never colour alone.

---

## S15 — Scale (SC-009)

Enable the 20,000-request scale mode in the scenario controller and exercise paging, search,
combined filters, sorting by amount and by date, and the dashboard.

**Expect**: p95 under 2 seconds for each. Figures are printed by the suite, so a run produces
evidence rather than just a pass.
