# Phase 0 Research: Student Management

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-31

All unknowns carried from the Technical Context are resolved below. No `NEEDS CLARIFICATION` marker remains.

---

## R1. Who creates the student record

**Decision**: Student Management owns a narrow inbound intake port, `StudentIntakePort.enrollFromAdmission({ admissionId, expectedAdmissionVersion })`. The port calls the existing Admissions public read `admissionsService.enrollmentReadiness(admissionId)`, validates `ready === true` and the presence of `approvalSnapshotId`, and materializes one Student plus its first enrollment from the returned projection. The operation returns a `StudentRef` that Admissions may record as its `externalEnrollmentReference`. Student Management exposes no manual create command and no create route.

**Rationale**: The 005 spec states Admissions "does not create students," while the 006 spec states students "are created from the Admissions process." A Student-owned inbound port satisfies both: Admissions stays a read source, Student Management stays the writer of its own aggregate, and neither module writes into the other's internals. `EnrollmentReadinessSummary` already exists in `features/admissions/index.ts` and already carries applicant identity, academic target with `offeringId`/`batchId` plus versions, branches, and the financial revision — exactly the intake payload needed.

**Alternatives considered**:

- _Admissions calls a Student write API_ — rejected: inverts the dependency, forces Admissions to know Student internals, and contradicts the 005 boundary.
- _A neutral orchestration module between the two_ — rejected: a third module with no independent business meaning; premature for a two-party handoff.
- _Student Management polls admissions for approved records_ — rejected: no deterministic trigger, and it would make the student list a derived view rather than an owned aggregate.

---

## R2. Enrollments as read-only while intake creates the first one

**Decision**: `StudentEnrollment` is an owned entity written **only** by the intake port and never by any UI-reachable command. The service facade exposes `listEnrollments(studentId)` and no create/update/remove enrollment operation. Additional enrollments for an existing student arrive through the same intake port when a second approved admission resolves to the same person. Each enrollment stores denormalized product, batch, branch, and status values captured at intake time.

**Rationale**: FR-012 requires multiple enrollments and FR-014 requires display-only. Confining writes to the intake port keeps both true without inventing a hidden enrollment editor, and denormalizing at intake satisfies FR-015 (an enrollment stays displayable after its product or batch is archived or rescheduled).

**Alternatives considered**:

- _Enrollments as a live projection recomputed from Admissions on every read_ — rejected: breaks FR-015 the moment a catalog record is archived, and makes the student list depend on another module's availability.
- _Allowing an admin enrollment editor "just for corrections"_ — rejected: directly violates FR-014.

---

## R3. Workspace composition — route segments vs. in-page tabs

**Decision**: Nested route segments under `app/(workspace)/students/[studentId]/` with a shared `layout.tsx` that renders the workspace header, status, and tab navigation. Overview lives at the segment root; `documents`, `notes`, and `timeline` are their own segments, each with `loading.tsx` and `error.tsx`. `edit` is a separate segment.

**Rationale**: Spec US3-5 and US3-6 require that one failing or forbidden area leaves the others usable. Route segments give that from the framework's own error/loading boundaries instead of hand-rolled per-panel state, plus automatic code splitting, deep-linkable areas, and a smaller client boundary on the overview. It also matches the routes named in the plan request (`/students/:id/documents`, `/students/:id/timeline`).

**Addition to the requested route list**: `/students/[studentId]/notes` is added as a sibling segment. Notes are permission-gated (FR-021) and unbounded in length, so they need their own boundary and query rather than sharing the overview's.

**Alternatives considered**:

- _Client-side tab state on one detail page_ — rejected: one large client boundary, no deep linking, and per-area error isolation becomes bespoke code.
- _Parallel routes with `@slot` conventions_ — rejected: slots shine when areas render simultaneously; here exactly one area is visible at a time, so slots add `default.tsx` bookkeeping for no benefit.

---

## R4. Missing shared components: tab navigation and timeline

**Decision**: Add two shared components.

1. `shared/components/layout/tab-navigation.tsx` — link-based tabs over route segments, active state from `usePathname`, WAI-ARIA `tablist`/`tab` semantics on links, roving tabindex, RTL-correct Home/End and arrow-key handling (in RTL, `ArrowLeft` advances), and permission-aware item filtering.
2. `shared/components/data-display/timeline.tsx` — presentational chronological list taking typed items with `id`, `occurredAt`, `title`, optional `description`, `actor`, `icon`, and `tone`; renders as an ordered list with a non-color status encoding and no business logic.

**Rationale**: Constitution IV requires establishing a shared component when a pattern recurs. Neither exists today: `grep` for `Tabs`/`role="tab"` returns nothing across `apps/web/src` and `packages/ui/src`, and the only timeline is `features/admissions/components/admission-lifecycle-timeline.tsx`. The student workspace makes both recur, and the future finance, attendance, and certificate tabs named in the plan request will recur again.

**Placement**: `apps/web/src/shared/components/` rather than `packages/ui/`, matching the existing split where `packages/ui` holds unstyled primitives (badge, button, card, input, skeleton) and `shared/components` holds composed app-level patterns (data-table, states, layout).

**Scope boundary**: Migrating the admissions lifecycle timeline onto the shared component is a tracked follow-up, not part of this feature. Modifying `features/admissions` here would violate Constitution II's rule that adding a module must not require changing existing modules.

**Alternatives considered**:

- _Feature-local tabs and timeline inside `features/students`_ — rejected: guarantees duplication as soon as the next workspace tab lands.
- _Adding a shadcn `tabs` primitive to `packages/ui`_ — rejected on its own: the primitive is panel-based, and this workspace needs navigation semantics over links; the composed shared component is the right layer.

---

## R5. Financial summary before Student Finance exists

**Decision**: Define `StudentFinanceReader.getFinancialSummary(studentId, signal?) -> StudentFinancialSummaryResult`, a discriminated union of `{ state: "available", summary }`, `{ state: "unavailable", reason }`, and `{ state: "forbidden" }`. The default wired adapter returns `unavailable` with reason `finance-module-absent`. A deterministic mock adapter, selectable through the scenario controller, returns populated summaries for fixtures. Money uses decimal strings plus configured precision, mirroring `Money` in the admissions domain.

**Rationale**: FR-027 forbids rendering zero or stale values as facts. A three-state union makes the honest path the only representable one and removes any temptation to default to `0`. Decimal strings avoid float drift in totals and balances.

**Alternatives considered**:

- _Nullable summary_ — rejected: `null` cannot distinguish "no data yet" from "not permitted" from "source down", which spec US9 scenarios 3 and 4 require separately.
- _Deriving totals from the admission financial snapshot_ — rejected: that snapshot is the admission's required amount, not the student's ledger; presenting it as paid/remaining would be wrong.

---

## R6. Status transition policy

**Decision**: One pure, exported table `studentTransitionPolicy: Record<StudentStatus, Partial<Record<StudentStatus, TransitionRule>>>` where `TransitionRule` carries `permission`, `reasonRequired`, and an optional `correction: true` marker. Encoded transitions:

| From | To | Permission | Reason | Notes |
| --- | --- | --- | --- | --- |
| `active` | `suspended` | `students.status.manage` | required | |
| `active` | `graduated` | `students.status.manage` | optional | |
| `active` | `withdrawn` | `students.status.manage` | required | |
| `active` | `archived` | `students.archive` | required | |
| `suspended` | `active` | `students.status.manage` | optional | |
| `suspended` | `withdrawn` | `students.status.manage` | required | |
| `suspended` | `archived` | `students.archive` | required | |
| `graduated` | `archived` | `students.archive` | optional | |
| `graduated` | `active` | `students.status.correct` | required | correction |
| `withdrawn` | `archived` | `students.archive` | optional | |
| `withdrawn` | `active` | `students.status.correct` | required | correction |
| `archived` | `active` | `students.activate` | optional | |

The same table drives the mock service's refusals, the available-actions projection rendered in the UI, and bulk-action per-record evaluation. No transition is reachable in the UI that the service would refuse, and no UI check substitutes for the service check.

**Rationale**: Confirms the assumption recorded in the spec while satisfying FR-029. One table consumed by policy, service, and presentation prevents the classic divergence where a button exists for a transition the service rejects. It mirrors the proven `admissionTransitionPolicy` shape in `features/admissions/utils/admission-lifecycle.ts`.

**Alternatives considered**:

- _Free-form status field with UI-only guards_ — rejected: unenforceable, and fails FR-029 and SC-008.
- _Full state machine library_ — rejected: a 12-edge table needs no runtime dependency.

---

## R7. Timeline sourcing, ordering, and pagination

**Decision**: `StudentTimelineEvent` is a discriminated union on `category`: `admission-submitted`, `admission-approved`, `student-created`, `enrollment-added`, `document-uploaded`, `document-replaced`, `document-archived`, `profile-updated`, `status-changed`, plus reserved `financial-event` and `academic-event` members for future modules. The service merges student-owned events with admission-derived events pulled through the Admissions reader port at intake time (persisted into the student's timeline, not re-fetched per read), sorts by `occurredAt` descending with `sequence` as a stable tiebreak, and returns a cursor-paginated page keyed on `(occurredAt, sequence)`.

**Rationale**: FR-023 requires exactly one attributable event per successful operation and none per failure, so events are appended inside the same service command that mutates state. FR-024 requires long histories to stay readable; a keyset cursor keeps ordering stable while new events land, which offset pagination cannot. Persisting admission-derived events at intake means the timeline stays complete even if Admissions is unavailable later.

**Alternatives considered**:

- _Recompute the merge from Admissions on every timeline read_ — rejected: couples timeline availability to another module and re-sorts unboundedly.
- _Offset pagination_ — rejected: duplicates or skips rows when events are appended between page loads.
- _Deriving events from a generic audit log_ — rejected: audit logging is explicitly out of scope this phase; the timeline is a business surface, not an audit store.

---

## R8. List discovery at 20,000 students

**Decision**: A narrow `StudentSummary` projection (id, code, full name, phone hint, registration and study branch labels, department, primary product label, batch label, customer service employee, status, `updatedAt`, `version`) with all search, filtering, sorting, and pagination performed in the service facade. Query keys are normalized through a factory that includes the scope fingerprint from the employee-context store; reads accept `AbortSignal`; table columns are memoized; row selection is keyed by stable id.

**Rationale**: SC-004 targets 2s p95 across 20,000 records. Following the admissions pattern, list reads must never touch documents, notes, timeline, or finance. Including the scope fingerprint in the key prevents one employee's scoped results from being served to another context from cache.

**Alternatives considered**:

- _Client-side filtering over a full fetch_ — rejected: transfers and sorts 20,000 records in the browser and will not survive a real API.
- _Virtualized infinite list_ — rejected for the primary table: the spec asks for pagination with stable page semantics (US2-4), and virtualization complicates row selection and bulk actions.

---

## R9. Documents: versioning, archive, and retry safety

**Decision**: `StudentDocument` groups by configured type and holds `versions: StudentDocumentVersion[]` plus `currentVersionId` and `state: "missing" | "present" | "archived"`. Replace appends a version and repoints `currentVersionId`; archive flips state and preserves every version; no delete operation exists. Uploads carry a client-generated `uploadAttemptId`, and the service treats a repeated attempt id as the same upload.

**Rationale**: FR-019 requires previous versions to stay retrievable and archive to be non-destructive. The `uploadAttemptId` satisfies US6-7 (an interrupted upload retried must not create a duplicate) deterministically rather than by guessing at filename equality.

**Alternatives considered**:

- _Overwrite-in-place with a separate history log_ — rejected: makes "retrieve the previous version" a reconstruction problem.
- _Dedupe by filename plus size_ — rejected: false positives on legitimate re-uploads of the same file, false negatives on a renamed retry.

---

## R10. Concurrency and conflict handling

**Decision**: Every command carries `expectedVersion`. The service compares against the current aggregate version and returns a typed `StudentsError` with code `version-conflict` carrying the current version. Screens surface a conflict notice offering refresh, keep the user's input in the form, and never auto-merge.

**Rationale**: FR-037 and US4-5 require refusal rather than silent overwrite; FR-039 requires input preservation. This matches the optimistic-version approach already used across admissions.

**Alternatives considered**:

- _Last-write-wins_ — rejected outright by FR-037.
- _Field-level merge_ — rejected: silently produces records neither employee authored.

---

## R11. Student code uniqueness

**Decision**: The student code is allocated by the service at intake from a configurable pattern, and uniqueness is a service invariant returning a typed `duplicate-student-code` error. There is no Zod uniqueness rule, because no form ever edits the code.

**Rationale**: The plan request lists "student code uniqueness" under the validation strategy, but FR-008 makes the code non-editable. Validation belongs where the value is produced. Coverage moves to contract tests (allocation, collision, concurrent intake) rather than form tests.

**Alternatives considered**:

- _An async form validator on a read-only field_ — rejected: validates a value the user cannot change.
- _Client-generated codes_ — rejected: cannot guarantee organization-wide uniqueness.

---

## R12. State ownership boundaries

**Decision**: TanStack Query owns all asynchronous student state, one query key per workspace area so areas invalidate independently. The existing `shared/store/employee-context-store.ts` supplies employee identity, permissions, authorized branches, and the scope fingerprint. Zustand gains no student-specific store. React local state is limited to dialog open/close, dropzone interaction, and uncommitted form state held by React Hook Form.

**Rationale**: Constitution Technical Principles assign server state to TanStack Query, cross-feature global client state to Zustand, and local state to UI interaction only. Nothing in this module is cross-feature client state, so adding a store would be unjustified surface area.

**Alternatives considered**:

- _A student workspace Zustand store_ — rejected: duplicates cache state already owned by the query layer and invites drift.
- _URL as the sole source of list state_ — partially adopted: list query parameters stay URL-serializable for shareable filters, but the cache remains authoritative for results.

---

## R13. Permission keys

**Decision**: The module registers these keys, each independently checked at both the route and the service operation (FR-036): `students.view`, `students.update`, `students.archive`, `students.activate`, `students.status.manage`, `students.status.correct`, `students.export`, `students.enrollments.view`, `students.documents.view`, `students.documents.manage`, `students.notes.view`, `students.notes.manage`, `students.timeline.view`, `students.finance.view`, and `students.intake`.

**Rationale**: Separate view and manage keys per area are what make the forbidden-area scenarios (US3-6, US7-4, US9-4) expressible. `students.intake` is a system-boundary key for the enrollment handoff, not an interactive one.

**Alternatives considered**:

- _A single `students.manage` key_ — rejected: cannot express "can view the student but not the notes", which the spec requires.

---

## R14. Arabic, RTL, and mixed-direction values

**Decision**: All copy lives in `features/students/config/students-copy.ts` as a single Arabic message map, keeping content separable from layout for future languages. Student codes, national identifiers, phone numbers, dates, and money are wrapped with the existing `shared/utils/bidi.ts` isolation helpers wherever they appear inside Arabic sentences, table cells, timeline entries, and dialogs. Tab navigation, table sort indicators, dropzone affordances, and timeline connectors use logical properties so they mirror correctly.

**Rationale**: Constitution VII requires RTL-native behavior rather than a visual translation pass, and the spec's edge cases call out mixed-direction identifiers explicitly. The bidi utility already exists and is used by sibling features.

**Alternatives considered**:

- _Per-component inline direction attributes_ — rejected: scatters the rule and gets missed in new components.

---

## Resolved Technical Context

| Item | Resolution |
| --- | --- |
| Language/Version | TypeScript 5 strict, React 19.2.4, Next.js 16.2.6 App Router, Node 20+ — confirmed from `apps/web/package.json` |
| Primary dependencies | TanStack Query 5, TanStack Table 8, Zustand 5, RHF 7, Zod 4, react-dropzone 19, Lucide, Sonner, Tailwind 4 — all already installed; no new dependency is required |
| Storage | Deterministic in-memory mock adapter behind `StudentsService`; browser object URLs for previews only |
| Testing | Vitest 4 + Testing Library + jsdom; Playwright 1.62 + `@axe-core/playwright` |
| Target platform | Evergreen browsers, desktop/laptop/tablet, Arabic RTL default, light/dark/system |
| Project type | Frontend web app in an npm/Turborepo workspace |
| Performance goals | 2s p95 list interactions at 20,000 records; independent per-area loading |
| Constraints | No manual create, no delete, display-only enrollments, read-only finance, archived read-only, exact permission and branch scope |
| Scale/scope | 6 routes, 5 workspace areas, 20,000 summaries, 9 journeys, 11 entities, 2 promoted shared components |
