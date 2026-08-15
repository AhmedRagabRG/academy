# Quickstart: Validate Admissions

## Implementation validation (2026-07-31)

- `npm run lint -w web -- --quiet`: passed.
- `npm run typecheck -w web`: passed.
- `npm run test -w web`: passed, 70 files / 97 tests.
- `npm run build -w web`: passed; all four Admissions routes were generated.
- Admissions unit slice: 6 files / 11 tests passed, including the 10,000-summary goal.
- Admissions Playwright matrix: 9/9 passed across desktop, laptop, and tablet for route
  management, axe analysis, and keyboard operation.

## Prerequisites

- Node.js 20+ and npm 10.9+
- Application Foundation, Organization & Settings, Academic Catalog, and Program Batches available
- Dependencies installed from the repository root
- Mock employee contexts for organization-wide and branch-scoped permission combinations
- Configured active branches, departments, eligible employees, lead sources, grades, qualifications, identity/document policies, currency/precision, offerings, and an eligible Professional Program batch
- Deterministic PDF/JPEG/PNG fixtures plus unsupported, oversized, and interrupted-upload scenarios

Before implementation validation, confirm the public dependency gaps identified in [contracts/admissions-contracts.md](./contracts/admissions-contracts.md) are satisfied through consumer-safe lookup adapters rather than Admissions-owned hardcoded data.

## Run and Quality Gates

```bash
npm install
npm run dev
```

Run all gates from the repository root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Expected: all commands succeed; list/create/detail/edit routes build; desktop, laptop, and tablet projects pass; automated accessibility checks contain no serious or critical findings.

## Scenario 1: Register, Resume, and Archive a Draft

1. Open `/admissions/create` with create permission.
2. Enter valid applicant identity, phone, birth, qualification, graduation, assignment, and notes information.
3. Save a Draft, refresh, deep-link to detail/edit, and update permitted values.
4. Attempt invalid phone/national ID, future birth/graduation values, and missing guardian information for a configured minor.
5. Archive the Draft with a reason and verify no permanent-delete action exists.

Expected: the valid Draft persists with separate Applicant and Admission identities; invalid supplied values map to fields without clearing dirty input; archived history remains readable and read-only.

## Scenario 2: Resolve Duplicate Applicants Safely

1. Register values matching an existing normalized national ID.
2. Repeat with a shared phone and with matching name/date of birth.
3. Choose the existing Applicant and create a new permitted Admission.
4. Retry with a justified duplicate exception using and lacking the exact permission.
5. Simulate two concurrent attempts for the same applicant and academic target.

Expected: candidates are redacted and explain match strength; no record is silently merged; exception reason/actor/time are retained; unauthorized or concurrent duplicate active cases are blocked safely.

## Scenario 3: Select Offerings and Revalidate Eligibility

1. Select a Professional Program and verify one matching eligible batch is required.
2. Try a batch belonging to another program, closed/outside-window/full batch, and unauthorized registration/study branches.
3. Select a Diploma and Course and verify batch is cleared and forbidden.
4. Change offering/batch after entering branches, documents, and finances; inspect and confirm the exact reset/recalculation consequences.
5. Make the selected offering or batch ineligible between selection, submission, and approval.

Expected: stable offering kind drives behavior; selection, submission, and approval each re-evaluate current facts; incompatible values never persist silently; ineligibility returns ordered reason codes.

## Scenario 4: Upload, Replace, and Verify Documents

1. Inspect required/optional document slots for the selected offering and applicant policy.
2. Upload valid PDF, JPEG, and PNG files and preview/download them with document-view permission.
3. Attempt unsupported, oversized, empty, and interrupted uploads, then retry.
4. Verify one document and reject another with a required reason.
5. Replace the verified document and confirm the new version becomes Pending while prior version/decision history remains.
6. Change pre-approval policy requirements, then compare an already Approved snapshot.

Expected: failed uploads do not replace valid versions; each decision targets an exact version; replacement invalidates only current verification; approval is blocked by every missing/pending/rejected required item; approved evidence is immutable.

## Scenario 5: Prepare and Freeze Financial Terms

1. Load Program Batch terms and separately load Diploma/Course Catalog terms.
2. Apply percentage and amount discounts at configured currency precision.
3. Try negative values, discount above price, conflicting values, and currency mismatch.
4. Submit and return the case, revise terms with a reason, and inspect revision history.
5. Approve, then change the source price and verify the approved snapshot remains unchanged.

Expected: one discount input is authoritative, derived totals reconcile exactly in minor units, required amount never becomes negative, and future consumers receive immutable approved terms rather than current mutable pricing.

## Scenario 6: Exercise Review and Lifecycle Decisions

1. Attempt Draft submission with applicant, assignment, academic, finance, and configured submission gaps.
2. Complete readiness and move Draft → Submitted → Under Review.
3. Return Submitted and Under Review records to Draft with correction reasons.
4. Reopen Rejected → Draft, resubmit, and review again.
5. Attempt approval with an ineligible batch, missing/rejected documents, invalid finance, inactive assignment, and stale version.
6. Approve a ready case and inspect the immutable approval snapshot/event.
7. Reject with and without a reason; archive permitted Draft/Rejected/Approved records; attempt prohibited shortcuts and terminal changes.

Expected: only the transition table succeeds, exact permissions and reasons apply, one event/snapshot is appended atomically per success, failed transitions append nothing, and non-Approved cases are never enrollment-ready.

## Scenario 7: Validate Future Consumer Boundaries

1. Request enrollment readiness for Draft, Submitted, Under Review, Rejected, Approved, Archived, and Enrolled fixtures.
2. Inspect the Approved projection under minimal permitted context.
3. Verify the snapshot contains stable applicant/admission/academic/branch/financial identities and eligibility reasons.
4. Verify raw documents, private links, unrestricted notes, permissions, and unrelated Admissions are absent.
5. Simulate an idempotent future enrollment confirmation with matching and mismatching snapshot references.

Expected: only Approved with a matching snapshot is ready; Admissions creates no Student, Enrollment, Payment, or seat reservation; consumer contracts remain minimal and immutable.

## Scenario 8: Search, Filter, Sort, Paginate, and Scale

1. Enable at least 10,000 deterministic Admission summaries.
2. Search Arabic/English names, phones, admission references, national-ID fragments under permission, product codes, and batch codes.
3. Combine branch, product, batch, status, admissions employee, customer service employee, and manager filters.
4. Sort/page, change criteria, reload canonical query state, and verify page reset/clamping and stable totals.
5. Select rows across filter changes and run one lifecycle-safe bulk action with mixed outcomes.
6. Export the same scoped query with and without export permission.

Expected: a known case is found within 30 seconds and interactions expose results within 2 seconds for at least 95% of the deterministic run; selection reconciles; partial outcomes are explicit; list rows never load documents/history/full PII.

## Scenario 9: Permissions, Scope, Concurrency, and Failure States

1. Exercise contexts for each implemented permission independently, including finance/document view versus manage/verify.
2. Open direct routes and commands for records inside and outside authorized branches and organization scope.
3. Attempt crafted query, export, bulk, assignment, document, finance, and lifecycle requests with broader caller-supplied IDs.
4. Reproduce latency, true/filtered empty, forbidden, not-found, unavailable, retryable, duplicate, stale, invalid dependency, upload interruption, readiness, partial-bulk, and unexpected modes.
5. Resolve a concurrent edit/decision after a stale-version response.

Expected: UI and mock services enforce exact keys plus authenticated scope, protected values are omitted/redacted, recoverable failures preserve input, retry works, and mock security remains documented as non-authoritative.

## Scenario 10: RTL, Responsive, and Accessibility

Validate list, create, detail, edit, review, document, finance, history, dialog, empty, error, and forbidden states around 1440, 1024, and 768 px, at 200% zoom, in light and dark themes.

- Complete registration, upload, verification, table, and lifecycle journeys using only the keyboard.
- Verify headings, fieldsets, error summary links, first-error focus, table/sort/selection semantics, and live readiness/upload/finance announcements.
- Verify confirmation/rejection/verification dialog focus trap, Escape/cancel, pending behavior, and return focus.
- Confirm Arabic RTL and Alexandria typography while phones, identity values, references, codes, dates, filenames, money, and URLs remain correctly isolated.
- Confirm statuses and requirement/readiness meaning are understandable without color.
- Confirm only table viewports scroll horizontally and no sticky summary/action region hides content.
- Run axe and manually review representative journeys with a screen reader.

Expected: no trapped/lost focus, clipped action, page-level overflow, unreadable mixed-direction content, or serious/critical accessibility violation.

## Contract References

- Entities, validation, lifecycle, snapshots, and relationships: [data-model.md](./data-model.md)
- Routes, services, dependency readers, permissions, queries, errors, and future consumers: [contracts/admissions-contracts.md](./contracts/admissions-contracts.md)
- Technical decisions and alternatives: [research.md](./research.md)
