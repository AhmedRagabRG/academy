# Quickstart: Validate Student Management

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/student-management-contracts.md](./contracts/student-management-contracts.md)

This is a validation and run guide. It proves the feature works end to end once implemented; it is not an implementation guide. Implementation steps belong in `tasks.md`.

## Prerequisites

- Node.js 20+ and npm 10.9.3 (see the root `package.json` `engines` and `packageManager` fields)
- Dependencies installed from the repository root: `npm install`
- No backend, database, or file storage is required — every read and write runs through the deterministic mock adapter behind `StudentsService`

Fixtures seed students across all five statuses, all three offering kinds, multiple branches and departments, students with and without a national identifier, minors with and without a guardian phone, students with zero and with several enrollments, documents in `missing`/`present`/`archived` states, and both populated and unavailable financial summaries. `studentScenarios` toggles failure, latency, permission, branch-scope, conflict, and finance-availability modes without touching component code.

## Run and Quality Gates

Start the app:

```bash
npm run dev
```

Then open `http://localhost:3000/students`.

Run every gate from the repository root:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Run the end-to-end and accessibility suites:

```bash
npm run test:e2e
```

Run only this feature's unit, integration, and contract suites:

```bash
npm run test -w web -- students
```

All four gates plus both Playwright suites must pass with no skipped student specs before the feature is considered complete.

---

## Scenario 1: Students Arrive Only From Admissions

Covers US1, FR-001 – FR-003, FR-007, SC-001, SC-002.

1. Load `/students` and confirm the page header exposes no create action, and no row action offers delete.
2. Through `studentScenarios`, submit an approved admission to `studentIntakePort.enrollFromAdmission`. Confirm exactly one new student appears with a unique code, an admission reference, admission and enrollment dates, and `active` status.
3. Submit the **same** admission again, then submit it twice concurrently. Confirm the same `StudentRef` is returned each time, the list count is unchanged, and no duplicate enrollment or timeline event was created.
4. Submit an admission that is not approved, one whose readiness is `false`, and one with a stale version. Confirm each is refused with `admission-not-ready` or `admission-version-stale` and that no student is created.
5. Attempt to reach `/students/create` directly. Confirm it does not exist.

**Expected**: every student traces to an approved admission; intake is idempotent; no manual create or delete path exists.

## Scenario 2: Find Students Under Scope

Covers US2, FR-032 – FR-034, SC-003, SC-004.

1. Search by full name, student code, primary phone, guardian phone, and national identifier, including Arabic name variants, mixed-direction input, and extra whitespace.
2. Combine branch, department, product, batch, status, and customer service employee filters. Confirm results satisfy every condition simultaneously.
3. Sort by name, code, enrollment date, status, and last update; page forward and back; confirm ordering and page boundaries stay stable.
4. Change a filter while on a high page number. Confirm pagination clamps or resets to a valid page while the remaining filters survive.
5. Apply a filter combination matching nothing. Confirm the empty state explains the situation and offers a way to clear filters.
6. Switch to the branch-scoped employee scenario. Confirm out-of-scope students disappear from the list and that opening one by direct URL returns forbidden rather than a partial record.
7. Load the 20,000-record scale fixture and time search, filter, sort, and page interactions.

**Expected**: filters compose correctly, scope holds on both list and direct access, and interactions stay under 2 seconds at the 95th percentile.

## Scenario 3: The Workspace Loads Area by Area

Covers US3, FR-004 – FR-006, FR-012 – FR-015, FR-038, SC-005, SC-006, SC-012.

1. Open a student. Confirm personal, academic, and system information are all present and that system values render as read-only.
2. Confirm the enrollment list shows product, batch where applicable, enrollment date, and status, and that it offers no create, edit, or remove action.
3. Confirm a professional-program enrollment shows a batch and that diploma and course enrollments show none.
4. Open a student whose product or batch was archived after enrollment. Confirm the historically recorded labels still render.
5. Open a student with no documents, no notes, and no enrollments. Confirm each area shows its own empty state, not an error.
6. Use `studentScenarios` to fail only the documents read. Confirm the documents tab shows a retryable error while overview, notes, and timeline stay usable.
7. Switch to an employee lacking `students.notes.view` and `students.finance.view`. Confirm those areas are withheld as forbidden and that their tabs are not presented as empty.

**Expected**: every area owns its loading, empty, error, unavailable, and forbidden state independently.

## Scenario 4: Maintain Profile Information Safely

Covers US4, FR-008, FR-009, FR-037, FR-039, SC-007.

1. Edit each maintainable field with valid values. Confirm the success toast and persisted values.
2. Confirm student code, admission reference, admission date, and enrollment date render but cannot be edited.
3. Submit an invalid national identifier, phone, guardian phone, date of birth, and graduation year. Confirm each field receives specific Arabic guidance, focus lands on the first error, and nothing is saved.
4. Clear the national identifier without supplying an alternative reason. Confirm the save is refused.
5. Edit a student whose age is under the configured minor threshold and clear the guardian phone. Confirm the save is refused.
6. Trigger a recoverable service failure mid-save. Confirm the entered values survive and a retry is offered.
7. Open the same student in two contexts, save from the first, then save from the second. Confirm a version conflict is reported, the second employee's input is preserved, and no silent overwrite occurs.
8. Open `/edit` for an archived student. Confirm locked read-only guidance rather than editable controls.

**Expected**: validation blocks before saving, protected fields stay protected, and conflicts refuse rather than overwrite.

## Scenario 5: Govern the Lifecycle

Covers US5, FR-028 – FR-031, SC-008, SC-011.

1. From `active`, apply suspend, graduate, withdraw, and archive. Confirm reason capture where the policy requires it and that each records actor, time, prior status, resulting status, and reason.
2. Attempt every transition the table in [data-model.md](./data-model.md#state-transitions) marks unavailable. Confirm each is refused with a specific explanation and no status change.
3. Remove `students.status.manage` and `students.archive`. Confirm every transition is refused and no history entry appears.
4. Activate an archived student. Confirm it returns to an operational status, becomes editable again, and its history is continuous.
5. Confirm archived students remain findable, readable, and present in historical filters.
6. Force a status-change failure. Confirm no status-change record and no timeline event were appended.
7. Select a mixed batch of students and apply a bulk status change. Confirm per-record applied and refused outcomes are both reported.

**Expected**: the transition table governs the UI and the service identically, and no failure leaves a partial trace.

## Scenario 6: Manage Documents Without Destruction

Covers US6, FR-016 – FR-019, SC-012.

1. Open the documents tab. Confirm present, missing, and archived documents are distinguished per configured type.
2. Upload an accepted file within the size limit. Confirm type, filename, size, upload time, and uploader are recorded.
3. Upload an unsupported type, an oversized file, an empty file, and an unreadable file. Confirm each is refused and no existing document is replaced or damaged.
4. Replace an existing document. Confirm a new current version and that the previous version is still retrievable from history.
5. Preview and download as a permitted employee, then as an employee without `students.documents.view`. Confirm success then refusal.
6. Archive a document. Confirm it leaves the active set, remains retrievable, and offers no delete.
7. Interrupt an upload and retry it with the same attempt id. Confirm exactly one attachment results.

**Expected**: documents version forward, archive without deletion, and never duplicate on retry.

## Scenario 7: Notes and Timeline

Covers US7, US8, FR-020 – FR-024, SC-009.

1. Add notes as two different employees. Confirm each stores author, time, and content, and that ordering is newest first.
2. Submit an empty and a whitespace-only note. Confirm refusal with specific guidance and nothing stored.
3. Switch to an employee without `students.notes.view`. Confirm notes are neither rendered nor retrievable.
4. View a note whose author is inactive. Confirm the original attribution is preserved.
5. Open the timeline. Confirm admission submission, admission approval, and student creation appear in chronological order.
6. Perform a profile update, a document upload, a document replacement, and a status change. Confirm each adds exactly one correctly ordered event with actor and time.
7. Force one of those operations to fail. Confirm no event was appended.
8. Load a student with a long history and page through the timeline. Confirm chronological order stays stable and nothing duplicates or skips across pages.

**Expected**: exactly one event per successful operation, none per failure, with stable cursor ordering.

## Scenario 8: Financial Summary Stays Read-Only and Honest

Covers US9, FR-025 – FR-027.

1. With the populated finance scenario, confirm total fees, paid amount, remaining balance, active installments, and currency render as read-only values.
2. Confirm no payment, refund, adjustment, installment, or schedule action exists anywhere in the module.
3. Switch the finance reader to its default unavailable state. Confirm an explicit unavailable message with a retry, and that no zero values are presented as facts.
4. Force a finance source error and a timeout. Confirm both surface as unavailable with distinguishable reasons.
5. Remove `students.finance.view`. Confirm the area is withheld as forbidden rather than shown empty.

**Expected**: absence is never rendered as zero, and no financial action is reachable here.

## Scenario 9: Consumer Boundary and Future Readiness

Covers FR-041, SC-015.

1. Call `getContextSummary` for an in-scope student. Confirm it returns identity, status, assignment, enrollment targets, document completeness, financial summary state, and the admission reference.
2. Confirm it carries no note content, no document download URLs, no address, and no national identifier.
3. Call it for an out-of-scope student. Confirm the same forbidden behavior as interactive reads.
4. Confirm `features/students/index.ts` exports only the surface listed in the [contracts](./contracts/student-management-contracts.md#public-feature-boundary), and that no other feature imports student internals.
5. Confirm `features/students` imports Admissions, Organization, Catalog, and Batch facts only through its own reader ports.

**Expected**: one stable, minimal, permission-scoped consumer contract with no leakage in either direction.

## Scenario 10: RTL, Responsive, and Accessibility

Covers FR-038, SC-013, SC-014, and the constitution's RTL, responsive, and accessibility principles.

1. Confirm Arabic renders throughout and that the layout is RTL-native across list, workspace tabs, forms, document cards, timeline, and dialogs.
2. Confirm student codes, national identifiers, phone numbers, dates, and money stay correctly isolated inside Arabic text.
3. Exercise every workflow at desktop, laptop, and tablet widths and at 200% zoom. Confirm no loss of functionality and no horizontal overflow.
4. Traverse the workspace using only the keyboard. Confirm tab navigation follows roving focus with RTL-correct arrow keys plus Home/End, and that every action is reachable.
5. Confirm dialogs trap and restore focus, first-error focus works in the editor, and status changes and command outcomes are announced.
6. Confirm status is never communicated by color alone.
7. Run axe across `/students`, the workspace overview, edit, documents, notes, and timeline in both light and dark themes. Confirm no serious or critical violations.

**Expected**: keyboard-complete, screen-reader-coherent, RTL-native, and clean under axe on every route.

---

## Contract References

- Service facade, intake port, reader ports, error codes, query keys: [contracts/student-management-contracts.md](./contracts/student-management-contracts.md)
- Entities, validation rules, transition table, query model: [data-model.md](./data-model.md)
- Design decisions and rejected alternatives: [research.md](./research.md)
