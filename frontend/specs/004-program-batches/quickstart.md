# Quickstart: Validate Program Batches

## Prerequisites

- Node.js 20+ and npm 10.9+
- Application Foundation, Organization & Settings, and Academic Catalog implementations available
- Dependencies installed from the repository root
- A mock employee context with the permissions needed by each scenario
- At least one active, batching-eligible Professional Program; active academic year, intake, and branches

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

Expected: all commands succeed, all nested batch routes build, and automated accessibility checks report no serious or critical findings.

## Scenario 1: Create and Edit Independent Batches

1. Open an eligible Professional Program and navigate to its Batches area.
2. Create a Draft with Arabic name, unique code, academic year, intake, valid schedule, positive capacity, finances, and branch assignments.
3. Save a second batch under the same program with different dates, capacity, price, plans, offers, and branches.
4. Edit each batch and confirm changes do not affect its sibling or parent program.
5. Attempt a duplicate normalized code, inactive dependency, and a parent product that is not a Professional Program.
6. Refresh and deep-link to list, detail, and edit routes; try a mismatched program/batch URL.

Expected: valid Drafts persist independently; invalid creation is blocked with field/dependency feedback; parent mismatch does not disclose the batch.

## Scenario 2: Validate Schedule and Capacity

1. Save an incomplete but otherwise valid Draft and verify readiness lists missing activation fields.
2. Try malformed dates, zero-length intervals, overlapping registration/study periods, and graduation before study end.
3. Configure maximum students and verify current students is read-only.
4. Use deterministic occupancy scenarios for available, nearly full, full, and over-capacity states.
5. Attempt to reduce maximum below current students.
6. Verify available seats are derived and never shown below zero.

Expected: draft-safe gaps remain saveable, invalid supplied values are rejected, capacity never drifts, and full status is communicated without color alone.

## Scenario 3: Configure Finances and Preserve History

1. Enter program price and registration fee in the configured organization currency.
2. Enable an amount-based plan and reconcile ordered installments to its covered charge.
3. Create a percentage plan totaling 100% within configured precision.
4. Attempt negative money, mixed plan bases, missing milestones, unbalanced totals, and invalid offer dates/percentages.
5. Add discount and scholarship references, reorder them by keyboard, and save.
6. Revise the financial profile and inspect immutable revision history.
7. Simulate a future enrollment snapshot referencing an earlier revision and verify later edits leave it unchanged.

Expected: only valid normalized financial profiles save, each accepted change creates a revision, and historical terms remain stable. No payment collection or final enrollment charge is calculated.

## Scenario 4: Assign Branches and Evaluate Eligibility

1. Assign distinct active registration and study branches.
2. Attempt to open registration without one role, then complete both roles and retry.
3. Verify a branch may hold both roles through explicit assignments.
4. Make a referenced branch inactive and confirm history remains readable but new assignment is unavailable.
5. Evaluate eligibility before, during, and after the registration window at assigned and unassigned branches.
6. Repeat with available, full, inactive-parent, and non-open batches.

Expected: only a Registration Open batch within its window, with seats, active parent, and active assigned registration branch is eligible; reason codes explain every denial.

## Scenario 5: Exercise Lifecycle and Corrections

1. Attempt Draft to Registration Open while readiness gaps exist.
2. Complete readiness and open registration; verify code and parent program become locked.
3. Close registration with confirmation and reason.
4. Correct Registration Closed back to Registration Open before study starts.
5. Correct Registration Open back to Draft with zero students, then verify the same correction fails with occupancy.
6. Advance Registration Closed to Studying and Studying to Graduated only when date requirements pass.
7. Archive from Draft and Graduated with confirmation/reason; try archival from Registration Open and Studying.
8. Simulate stale versions and concurrent transitions.

Expected: only the transition table succeeds, each success appends one event, failures append none, and Archived is historical/read-only.

## Scenario 6: Search, Filter, Sort, Paginate, and Scale

1. Enable a deterministic scenario with at least 10,000 batch summaries across programs, years, intakes, branches, statuses, and capacity states.
2. Within one program route, search Arabic/English names and codes.
3. Combine academic year, intake, branch, and status filters; sort and paginate.
4. Change criteria and verify page reset/clamping, stable totals, and selection reconciliation.
5. Deep-link and reload canonical query state.
6. Run lifecycle-safe permitted bulk actions and inspect partial outcomes.

Expected: a known batch is found within 30 seconds; screens never load or filter the complete collection; sorting and totals remain deterministic.

## Scenario 7: Permissions, Scope, and Failure States

1. Test contexts with only view, create, update, capacity, pricing, branch, each lifecycle, and export permissions.
2. Open direct routes without the required permission and verify forbidden—not empty or not-found—feedback.
3. Verify editor sections and actions require their exact permission.
4. As a branch manager, query and mutate associated and unassociated batches; attempt crafted broader scope.
5. Reproduce latency, empty, retryable failure, unavailable, forbidden, duplicate, stale, invalid dependency, parent mismatch, readiness, and unexpected modes.
6. Verify dirty form values survive every recoverable failure.

Expected: UI affordances and mock services honor exact keys and branch intersection. The documentation continues to identify future backend authorization as authoritative.

## Scenario 8: RTL, Responsive, and Accessibility

Validate list, create, detail, edit, lifecycle, history, dialog, empty, error, and forbidden states at approximately 1440, 1024, and 768 px, at 200% zoom, in light and dark themes.

- Complete primary journeys using only the keyboard.
- Verify heading, fieldset, table, sort, selection, history, and live-region semantics.
- Verify first-error focus, error-summary links, dialog focus trap/cancel/return, and unsaved-change recovery.
- Verify Arabic RTL layout and Alexandria typography; isolate codes, dates, currency, numbers, and URLs.
- Confirm capacity and lifecycle are understandable without color.
- Confirm only table viewports scroll horizontally and sticky actions never obscure content.
- Run axe checks and manually review representative journeys with a screen reader.

Expected: no trapped focus, lost action, page-level overflow, unreadable mixed-direction content, or serious/critical accessibility violation.

## Contract References

- Domain entities, validation, lifecycle, readiness, and eligibility: [data-model.md](./data-model.md)
- Route, service, query, permission, form, table, error, and consumer boundaries: [program-batches-contracts.md](./contracts/program-batches-contracts.md)
- Research decisions and alternatives: [research.md](./research.md)

## Implementation Validation

Validated on July 31, 2026:

- `npm run lint`: passed across the workspace.
- `npm run typecheck`: passed with strict TypeScript checks.
- `npm run test`: 64 Vitest files and 86 tests passed.
- `npm run build`: passed; the list, create, detail, and edit batch routes were emitted successfully.
- Full Playwright matrix: 99 scenarios exercised across desktop, laptop, and tablet. An accessibility-locator defect in one discovery test was corrected, and its three affected viewport runs then passed (96 initial passes plus 3 successful reruns).
- The eight scenarios above were reconciled against the automated unit, contract, integration, accessibility, responsive, and journey coverage plus manual implementation inspection. Evidence is recorded in `validation/`.

Mock authentication and permissions are frontend fixtures only. A future backend adapter remains responsible for authoritative authorization, tenant and branch isolation, atomic enrollment capacity, and durable audit history.
