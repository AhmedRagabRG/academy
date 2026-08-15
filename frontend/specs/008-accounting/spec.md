# Feature Specification: Accounting

**Feature Branch**: `008-accounting`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "Build the Accounting module for the Education Operations Platform. This module manages all internal expense requests submitted by organization branches. It enables branch staff to create expense requests, attach supporting documents, submit requests for review, and track the approval workflow managed by the Finance department. The module provides centralized visibility into organizational expenses while maintaining a complete approval history for auditing and operational transparency."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Raise and Submit an Expense Request (Priority: P1)

A branch manager records money the branch needs to spend: the date, the category and
sub-category it falls under, what it is for, and how much. They attach the invoice or receipt
that justifies it, save it as a draft while they gather documents, and submit it for review when
it is complete.

**Why this priority**: Nothing else in the module has anything to review until a request exists.
This is the smallest slice that delivers value on its own — a branch can record and track what it
has asked for, even before anyone reviews it.

**Independent Test**: Create a draft, edit it, attach a document, submit it, and confirm it
leaves the branch's hands with its figures, category, and attachments intact.

**Acceptance Scenarios**:

1. **Given** a branch manager, **When** they create a request with a date, branch, category,
   description, and a positive amount, **Then** it is saved as a Draft carrying a unique request
   number and the identity of the requester.
2. **Given** a Draft, **When** it is edited, **Then** the changes are saved and the request stays
   a Draft.
3. **Given** a Draft with every required field, **When** it is submitted, **Then** its status
   becomes Submitted and it becomes visible to Finance for review.
4. **Given** a Draft missing a required field or carrying a zero or negative amount, **When**
   submission is attempted, **Then** it is refused with the specific reason and nothing is
   submitted.
5. **Given** a Submitted request, **When** its author attempts to edit it, **Then** the edit is
   refused, because a request under review must not change beneath the reviewer.

---

### User Story 2 - Review, Approve, Reject, or Return a Request (Priority: P1)

A finance manager works the queue of submitted requests. For each one they read the description,
the amount, and the attachments, then decide: approve it, reject it with a reason, or return it
to the branch for revision with a note saying what is missing.

**Why this priority**: A request that no one can act on is a form, not a workflow. Together with
User Story 1 this is the module's minimum viable loop.

**Independent Test**: Submit a request, then approve one, reject a second, and return a third —
confirming each decision records its author, time, and notes, and that only the returned one
becomes editable again.

**Acceptance Scenarios**:

1. **Given** a Submitted request, **When** an authorized reviewer opens it for decision, **Then**
   its status becomes Under Review and the reviewer is recorded.
2. **Given** a request Under Review, **When** it is approved, **Then** its status becomes Approved
   and the decision, its author, its time, and any notes are recorded.
3. **Given** a request Under Review, **When** it is rejected, **Then** a reason is required, its
   status becomes Rejected, and the request becomes read-only.
4. **Given** a request Under Review, **When** it is returned for revision, **Then** a note is
   required, its status becomes Returned for Revision, and it becomes editable by its branch again.
5. **Given** a Returned request, **When** the branch edits and resubmits it, **Then** its status
   becomes Submitted and both the return and the resubmission appear in its history.
6. **Given** a user without review authority, **When** they attempt any decision, **Then** it is
   refused and nothing is recorded.

---

### User Story 3 - Read a Request's Full History (Priority: P1)

Anyone authorized to see a request can read exactly what happened to it: who created it, who
submitted it, every return and resubmission, the decision, and who marked it paid — each entry
carrying the action, the status it moved from and to, who performed it, when, and any note.

**Why this priority**: The module's stated purpose includes auditing. A workflow whose history
can be edited, or which records only its latest state, cannot be audited. This is P1 because
retrofitting a trustworthy history after the fact is not possible.

**Independent Test**: Drive a request through create, submit, return, resubmit, approve, and paid,
then confirm the history holds exactly one immutable entry per transition, in order.

**Acceptance Scenarios**:

1. **Given** a request that has moved through several states, **When** its history is read,
   **Then** every transition appears in chronological order with its action, previous status, new
   status, actor, time, and note.
2. **Given** any history entry, **When** an edit or deletion is attempted, **Then** it is refused —
   history is append-only.
3. **Given** a refused action, **When** the history is read, **Then** no entry was written for it,
   because the history records what happened, not what was attempted.

---

### User Story 4 - Configure Expense Categories and Sub-Categories (Priority: P2)

An administrator maintains the list of categories money can be spent under — Marketing, Office,
Utilities, Maintenance, Transportation, Equipment — and the sub-categories beneath each, such as
Facebook Ads or Printing under Marketing. Categories no longer in use are archived rather than
deleted, so past requests keep their meaning.

**Why this priority**: Requests need categories, but the seeded set is usable on day one.
Administering them is what keeps the module useful in month six.

**Independent Test**: Create, edit, archive, and reactivate a category and a sub-category, and
confirm an archived category cannot be chosen on a new request while existing requests still
display it.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they create a category with a name, description, and
   status, **Then** it becomes available for selection on new requests.
2. **Given** an active category, **When** it is archived, **Then** it disappears from the choices
   offered on new requests while every request already using it continues to display it.
3. **Given** an archived category, **When** it is reactivated, **Then** it becomes selectable
   again.
4. **Given** a sub-category, **When** it is created, **Then** it belongs to exactly one parent
   category and is offered only when that category is chosen.
5. **Given** a category with active sub-categories, **When** it is archived, **Then** its
   sub-categories are no longer offered either.

---

### User Story 5 - Mark an Approved Request as Paid (Priority: P2)

Once the money has actually left the organization, a finance manager records that the approved
request has been paid, closing it.

**Why this priority**: Approval and payment are different facts, and conflating them makes the
dashboard's "approved" and "paid" figures meaningless. It is P2 because approval alone already
delivers a working review loop.

**Independent Test**: Approve a request, mark it paid, and confirm no other status can be marked
paid and that the paid request is closed to further change.

**Acceptance Scenarios**:

1. **Given** an Approved request, **When** it is marked paid, **Then** its status becomes Paid
   and the action, actor, and time are recorded.
2. **Given** a request in any status other than Approved, **When** marking paid is attempted,
   **Then** it is refused.
3. **Given** a Paid request, **When** any modification is attempted, **Then** it is refused.

---

### User Story 6 - Find Requests Across Branches (Priority: P2)

A finance or executive user works through many branches' requests at once: searching by request
number or requester, filtering by branch, category, sub-category, status, and date range, sorting
by date or amount, and paging through the results.

**Why this priority**: The review loop works for a handful of requests without it. It becomes
necessary as soon as several branches are active.

**Independent Test**: Apply each filter alone and in combination, confirm the result set narrows
correctly, and confirm an empty result distinguishes "nothing matched" from "nothing exists".

**Acceptance Scenarios**:

1. **Given** requests across several branches, **When** a branch filter is applied, **Then** only
   that branch's requests are listed.
2. **Given** several filters, **When** they are applied together, **Then** the result satisfies
   all of them.
3. **Given** a date range, **When** it is applied, **Then** requests on the first and last day of
   the range are included.
4. **Given** filters that match nothing, **When** the list is read, **Then** it says no request
   matched and offers to clear the filters.
5. **Given** a user limited to certain branches, **When** they list requests, **Then** they see
   only requests from those branches.

---

### User Story 7 - See the Organization's Expense Picture (Priority: P3)

An executive or finance manager opens a dashboard showing how many requests are pending,
approved, rejected, and paid, what the month's expenses total, and how expenses break down by
branch and by category.

**Why this priority**: Genuinely useful for oversight, and genuinely dependent on everything
above having produced real data. Building it first would mean building it against nothing.

**Independent Test**: With requests in several statuses across branches and categories, confirm
each dashboard figure equals what the corresponding filtered list reports.

**Acceptance Scenarios**:

1. **Given** requests in several statuses, **When** the dashboard is opened, **Then** each count
   equals the number of requests the equivalent filtered list returns.
2. **Given** a user limited to certain branches, **When** the dashboard is opened, **Then** its
   figures cover only those branches.
3. **Given** no requests at all, **When** the dashboard is opened, **Then** it states that there
   are none rather than displaying zeroes that look like totals.

---

### Edge Cases

- A request is submitted while a reviewer has it open — the reviewer's decision must act on what
  is actually stored, not on a stale copy of it.
- Two reviewers act on the same request at the same time; only one decision can take effect, and
  the other must be told the request has moved on rather than silently overwriting it.
- A category or sub-category is archived while a draft that uses it is still unsubmitted.
- A sub-category is chosen, then the main category is changed to one that does not contain it.
- A request is returned for revision, edited to a different amount or category, and resubmitted —
  the history must show both versions' transitions, not just the latest.
- An attachment is of a permitted type but is empty, corrupt, or larger than the allowed size.
- The same document is uploaded twice, or an upload is retried after a failure — a retry must not
  produce a duplicate attachment.
- A requester leaves the organization; their past requests must still name them.
- A branch is archived in Organization & Settings while it has open requests.
- A request's amount is entered with Arabic-Indic digits, a thousands separator, or more decimal
  places than the currency allows.
- A user's branch scope changes between listing requests and opening one.

## Requirements *(mandatory)*

### Functional Requirements

#### Expense Categories and Sub-Categories

- **FR-001**: Authorized users MUST be able to create an expense category carrying a name, a
  description, and a status.
- **FR-002**: Authorized users MUST be able to edit, archive, and reactivate an expense category.
- **FR-003**: Authorized users MUST be able to create a sub-category carrying a name, a parent
  category, a description, and a status.
- **FR-004**: Authorized users MUST be able to edit, archive, and reactivate a sub-category.
- **FR-005**: Every sub-category MUST belong to exactly one parent category.
- **FR-006**: Archived categories and sub-categories MUST NOT be offered for selection on new or
  edited requests, while remaining displayed on requests that already reference them.
- **FR-007**: Categories and sub-categories MUST NOT be permanently deleted.
- **FR-008**: Category and sub-category names MUST be unique within their scope — categories
  across the organization, sub-categories within their parent.

#### Expense Requests

- **FR-009**: Authorized users MUST be able to create an expense request carrying a request
  number, a request date, a branch, a requester, a main category, an optional sub-category, a
  description, and a requested amount.
- **FR-010**: Every request MUST belong to exactly one branch and MUST name exactly one requester.
- **FR-011**: Request numbers MUST be unique and MUST follow a configurable pattern.
- **FR-012**: A requested amount MUST be greater than zero and MUST be expressed in the
  organization's configured currency and precision.
- **FR-013**: A request MUST be editable only while it is a Draft or Returned for Revision.
- **FR-014**: Authorized users MUST be able to cancel a request that has not yet been approved,
  recording the reason.
- **FR-015**: Requests MUST NOT be permanently deleted; cancelled and rejected requests remain
  readable.

#### Attachments

- **FR-016**: Users MUST be able to attach supporting documents to a request, each classified as
  an invoice, a receipt, or a supporting document.
- **FR-017**: The system MUST accept only PDF, JPG, JPEG, and PNG attachments and MUST refuse
  anything else with a message naming the accepted types.
- **FR-018**: The system MUST enforce a configurable maximum attachment size and refuse a file
  that exceeds it, naming the limit.
- **FR-019**: Attachments MUST be addable and removable only while the request is editable.
- **FR-020**: A retried upload MUST NOT produce a duplicate attachment.

#### Approval Workflow

- **FR-021**: A request MUST move through the lifecycle Draft → Submitted → Under Review →
  (Approved | Rejected | Returned for Revision), with Approved → Paid, and with Cancelled
  reachable from any state before Approved.
- **FR-022**: Only Finance Managers and Super Admins MUST be able to approve, reject, or return a
  request. Executive Managers MUST have read-only oversight — full visibility of every request and
  every dashboard figure, with no ability to decide.
- **FR-022a**: Review authority MUST be a permission key rather than a role check, so the set of
  roles holding it is configuration rather than code.
- **FR-022b**: Every decision MUST record which user made it, so a decision made by a Super Admin
  rather than a Finance Manager is visible in the history as such.
- **FR-023**: A rejection and a return MUST each require a note stating why; an approval MUST NOT.
- **FR-024**: Every decision MUST record the decision, its note, its date and time, and the user
  who made it.
- **FR-025**: A Returned request MUST become editable by its branch and MUST be resubmittable.
- **FR-026**: Only an Approved request MUST be markable as Paid.
- **FR-027**: Marking a request paid MUST require its own authority, distinct from the authority
  to approve it.
- **FR-028**: A request that has moved on since a reviewer loaded it MUST refuse a decision made
  against the stale view, rather than silently overwriting the newer state.
- **FR-029**: A refused action MUST leave the request exactly as it was, with no partial change.
- **FR-030**: Approval MUST be all-or-nothing on the requested amount — a reviewer MUST NOT be
  able to approve a figure different from the one requested. A request whose amount is wrong MUST
  be returned for revision, corrected by its branch, and resubmitted, so the correction is visible
  in the history rather than applied silently at approval.
- **FR-030a**: Every expense figure — the request, the dashboard totals, and the paid amount —
  MUST therefore refer to the single requested amount, with no second approved figure to reconcile.

#### Approval History

- **FR-031**: Every request MUST maintain a history recording, for each transition, the action,
  the previous status, the new status, the user who performed it, the date and time, and any note.
- **FR-032**: The history MUST cover creation, submission, entering review, return, resubmission,
  approval, rejection, cancellation, and payment.
- **FR-033**: History entries MUST NOT be editable or deletable by any user or action.
- **FR-034**: Exactly one history entry MUST be written per successful transition, and none for a
  refused one.
- **FR-035**: The history MUST be displayed in chronological order.

#### Comments

- **FR-036**: Authorized users MUST be able to add a comment to a request, recording its author
  and time.
- **FR-037**: Comments MUST be distinguishable from history entries, which record transitions
  rather than discussion.

#### Discovery

- **FR-038**: Users MUST be able to search requests by request number, requester, and description.
- **FR-039**: Users MUST be able to filter by branch, main category, sub-category, requester,
  status, and request-date range, with filters composing.
- **FR-040**: Date-range filters MUST include both the first and the last day of the range.
- **FR-041**: Lists MUST support sorting and pagination, and MUST report a total that reflects the
  filters in force.
- **FR-042**: An empty list MUST distinguish "no request matched these filters" from "no request
  exists", and MUST offer to clear the filters in the first case.

#### Dashboard

- **FR-043**: The module MUST present counts of pending, approved, rejected, and paid requests,
  the current month's total expenses, and breakdowns by branch and by category.
- **FR-044**: Every dashboard figure MUST equal what the equivalent filtered list reports for the
  same user.
- **FR-045**: The dashboard MUST state when there are no records at all, rather than presenting
  zeroes indistinguishable from real totals.

#### Access and Scope

- **FR-046**: Every view, create, edit, submit, decide, mark-paid, cancel, configure, and export
  action MUST be independently permission-aware.
- **FR-047**: Users MUST see only requests belonging to branches within their authorized scope,
  on every list, detail, dashboard figure, and export.
- **FR-048**: A permission refusal MUST be presented as a refusal, never as an empty result.

#### Validation

- **FR-049**: The system MUST validate every required field, the positivity and format of the
  amount, the presence of a branch and a main category, the consistency of a sub-category with its
  parent, and the type and size of every attachment — before submission, not after.
- **FR-050**: A refused submission MUST name the specific field and reason, and MUST move the
  user's attention to the first field that failed.

### Constitution Requirements *(mandatory for UI features)*

- **Business Workflow**: An expense request originates in a branch and is decided by Finance. The
  lifecycle, its permitted transitions, and the authority each transition requires are the
  module's core rules: only a Draft or Returned request is editable, only a request Under Review
  can be decided, only an Approved request can be paid, and marking paid is a separate authority
  from approving. Every transition is recorded immutably. Nothing is ever deleted.
- **Module Boundary**: A new Accounting module owning expense requests, categories,
  sub-categories, approval history, and comments, under its own route segment. It reads branches
  and departments from Organization & Settings and the acting user's identity and scope from the
  platform, through explicit read-only contracts. It holds no dependency on Student Finance, which
  handles a separate concern.
- **Dynamic Configuration**: Expense categories, sub-categories, the request-numbering pattern,
  the accepted attachment types and size limit, and the currency and precision are configurable
  business data. Seeded examples — Marketing, Office, Utilities — are data, not application rules.
- **Arabic & RTL**: Every label, status, action, empty state, and refusal message is Arabic and
  authored in one place. Layout is RTL-native rather than mirrored. Amounts, request numbers,
  dates, and file sizes are direction-isolated so their digits are not reordered by surrounding
  Arabic text.
- **Responsive & Accessibility**: Desktop, laptop, and tablet, with no horizontal page scrolling
  at any of them. Full keyboard operation, focus moved into dialogs and returned on close, focus
  moved to the first invalid field on a refused submit, errors announced, and status conveyed by
  text rather than colour alone.
- **UI States**: Every screen distinguishes loading, empty-because-no-data, empty-because-filtered,
  error-with-retry, forbidden, and success. A forbidden state is never rendered as an empty one.
- **Reuse**: Shared data table, filter toolbar, date-range control, forms, dialogs, file dropzone,
  status badges, cards, timeline, and empty/error/loading states. New shared components only where
  the pattern genuinely recurs.
- **Frontend Boundary**: All business rules live in a typed service layer behind one interface,
  with a mock implementation during frontend development. Screens orchestrate; they hold no
  lifecycle, permission, or arithmetic logic. Replacing the mock with a backend changes no screen.
- **AI & Future Context**: Statuses, categories, actors, amounts, and history entries are
  structured and typed rather than prose, so a future reporting, audit, or automation consumer
  reads facts rather than parsing text. Tenant scope, permission checks, and audit records are
  present from the start rather than retrofitted.

### Key Entities *(include if feature involves data)*

- **Expense Category**: A heading money is spent under. Carries a name, description, and status
  (active or archived). Owns sub-categories.
- **Expense Sub-Category**: A subdivision of exactly one category. Carries a name, parent
  category, description, and status.
- **Expense Request**: A branch's request to spend. Carries a request number, request date,
  branch, requester, main category, optional sub-category, description, requested amount, current
  status, and its attachments, history, and comments.
- **Attachment**: A document supporting a request. Carries its kind (invoice, receipt, or
  supporting document), file name, type, size, and who uploaded it and when.
- **Approval Decision**: A reviewer's act on a request. Carries the decision, note, decision date,
  and decider.
- **History Entry**: One immutable record of one transition. Carries the action, previous status,
  new status, performer, timestamp, and note.
- **Comment**: A note attached to a request for discussion rather than for the record of
  transitions. Carries its author, time, and body.
- **Branch**: Read from Organization & Settings; a request belongs to exactly one.
- **Requester**: The user who raised a request, named permanently on it regardless of later
  changes to their account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A branch manager can raise, attach a document to, and submit a complete expense
  request in under 3 minutes.
- **SC-002**: A finance manager can decide a request — approve, reject, or return with a note — in
  under 1 minute from opening it.
- **SC-003**: Every request's history contains exactly one entry per completed transition and none
  for any refused action, in 100% of tested workflows.
- **SC-004**: No history entry can be altered or removed through any action available in the
  interface, in 100% of attempts.
- **SC-005**: Every dashboard figure equals the count or total returned by the equivalent filtered
  list, in 100% of tested combinations of status, branch, and category.
- **SC-006**: A request that is not Approved cannot be marked Paid, in 100% of attempts.
- **SC-006a**: A user holding oversight but not review authority cannot approve, reject, or return
  any request, in 100% of attempts.
- **SC-006b**: An approved request's amount is identical to the amount that was requested, in 100%
  of approvals.
- **SC-007**: A request that is Submitted, Under Review, Approved, Rejected, Paid, or Cancelled
  cannot be edited, in 100% of attempts.
- **SC-008**: Two simultaneous decisions on the same request result in exactly one taking effect,
  with the other reported as a conflict, in 100% of tested races.
- **SC-009**: Search, filter, sort, and paging interactions return within 2 seconds at the 95th
  percentile across 20,000 requests.
- **SC-010**: Users see no request from a branch outside their authorized scope, on any list,
  detail, dashboard figure, or export, in 100% of tested scopes.
- **SC-011**: A refused submission names the failing field and reason in 100% of cases, with no
  generic failure message.
- **SC-012**: Every screen renders correctly right-to-left with no horizontal page scrolling at
  desktop, laptop, and tablet widths.
- **SC-013**: Every accounting route is free of critical and serious accessibility violations.
- **SC-014**: An archived category remains visible on requests that already reference it, in 100%
  of cases.

## Assumptions

- **Branches and users come from existing modules.** Branches and departments are read from
  Organization & Settings; the acting user's identity, roles, and branch scope come from the
  platform's existing authentication context. This module creates neither.
- **A single review step.** The description names one decision point, so approval is modelled as a
  single step rather than a multi-level chain or a threshold-based escalation. The lifecycle and
  its permission table are expressed as configuration so an additional step can be added later
  without reworking the model.
- **Review authority is shared, oversight is not.** Finance Managers and Super Admins decide;
  Executive Managers observe. Super Admin holds the authority as a fallback for when Finance is
  unavailable, not as a routine path — which is why every decision names its actor, making a
  non-Finance approval visible rather than indistinguishable.
- **One amount per request.** Because approval cannot alter the figure, a request has exactly one
  amount for its whole life. This removes an entire class of reconciliation question — requested
  versus approved versus paid — at the cost of one extra round trip when a branch gets the figure
  wrong. That round trip is recorded, which is the point.
- **Entering review is an explicit act.** A Submitted request becomes Under Review when a reviewer
  opens it to decide, and the reviewer is recorded. This makes "who is looking at this" answerable
  and avoids a queue where everything sits in one undifferentiated state.
- **Marking paid records that payment happened elsewhere.** This module records the fact of
  payment for reporting and audit; it does not move money, hold bank details, or integrate with a
  payment system — all explicitly out of scope.
- **One currency.** The organization's configured currency and precision apply to every amount, as
  in the rest of the platform. Multi-currency expenses are not in scope.
- **Amounts are exact.** Money is handled as exact decimal values throughout, never as
  floating-point figures, consistent with the rest of the platform.
- **Comments are not part of the audit record.** Comments support discussion; the immutable
  history records transitions. The two are kept separate so discussion cannot dilute the record.
- **Cancellation is available before approval only.** A request that has been approved has already
  committed the organization; withdrawing it after that is a decision the description does not
  describe, so it is not modelled.
- **Attachment storage is out of scope.** Uploads are represented by their metadata during
  frontend development; where the bytes ultimately live is a backend concern.
- **Audit logging is prepared, not implemented.** The module records actors, times, and
  transitions in a structured form that a future audit module can consume; it does not implement
  that module.
- **No AI behaviour.** AI Automation is explicitly out of scope; the module exposes structured
  data that a future AI consumer could read, and adds no AI features itself.
