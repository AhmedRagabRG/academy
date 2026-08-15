# Research: Program Batches

All technical-context questions are resolved. No `NEEDS CLARIFICATION` remains.

## Feature Ownership and Catalog Integration

**Decision**: Implement `program-batches` as an independent feature module and consume Professional Program summaries through the Academic Catalog public boundary.

**Rationale**: A batch has a distinct lifecycle, finance history, capacity, and future Enrollment consumers. Independent ownership prevents catalog internals from becoming a shared dependency while preserving nested program-context routes.

**Alternatives considered**:

- Put batches inside `academic-catalog`: rejected because it couples future Enrollment to catalog internals and expands one feature beyond a cohesive boundary.
- Duplicate program data in batch fixtures: rejected because it creates competing sources of truth.
- Make batches a generic shared entity: rejected because batch behavior is business-specific, not cross-feature infrastructure.

## Nested Routes and Next.js 16 Params

**Decision**: Use nested App Router segments under `academic-catalog/programs/[programId]/batches`; keep pages as Server Components that await promise-based `params` and pass validated strings into interactive feature screens.

**Rationale**: The URL maintains required program context. Repository-local Next.js 16 guidance states dynamic params are promises and recommends keeping client boundaries narrow. Route `loading.tsx` and `error.tsx` provide segment-level feedback.

**Alternatives considered**:

- Flat `/batches` routes: rejected because the approved workflow requires program context and makes parent mismatch easier.
- Make every page a Client Component and call `useParams`: rejected because it widens the client bundle unnecessarily.
- Pre-generate mock IDs: rejected because future program and batch counts are unbounded and runtime IDs must work.

## Service Boundary and Mock Adapter

**Decision**: Define a transport-neutral `ProgramBatchService` with typed commands and projections, then provide an asynchronous deterministic in-memory adapter plus scenario controls.

**Rationale**: Pages and screens remain unchanged when a backend adapter arrives. Explicit commands preserve business intent, expected versions, permission/scope checks, and typed errors better than generic CRUD.

**Alternatives considered**:

- Import fixtures into screens: rejected by frontend separation and future adapter requirements.
- Generic repository with `Partial<Batch>`: rejected because it permits invalid transitions and ownership changes.
- Zustand as server-data storage: rejected because asynchronous domain records belong to TanStack Query and the service boundary.

## Aggregate and Read Projection Design

**Decision**: Treat Program Batch as the aggregate root. Return narrow `BatchSummary` records for lists and a `BatchDetail` aggregate for editor/detail flows; lifecycle, readiness, eligibility, and revision history are separate projections.

**Rationale**: Lists do not need installment children or full history. Separate projections support targeted caching, future APIs, and AI/reporting contexts without loading or mutating an oversized object.

**Alternatives considered**:

- One shape everywhere: rejected for performance and accidental mutation risk.
- Independent persistence calls for every section: rejected in this phase because it complicates draft consistency and cross-section validation.

## Dates and Academic Schedule

**Decision**: Store date-only schedule values as canonical `YYYY-MM-DD` strings and compare normalized calendar dates without locale formatting or time-zone conversion.

**Rationale**: These are organizational academic dates rather than instants. Date-only values avoid server/client locale hydration differences and midnight shifts. Display formatting remains separate.

**Alternatives considered**:

- JavaScript `Date` objects in DTOs: rejected because they are not transport-neutral and introduce time-zone ambiguity.
- Localized date strings as source values: rejected because they are difficult to validate and sort consistently.

## Capacity Ownership

**Decision**: Store `maximumStudents`; obtain `currentStudents` from an enrollment-count boundary; derive `availableSeats = max(0, maximumStudents - currentStudents)` and a capacity status in domain projections.

**Rationale**: Current occupancy is not batch-admin input. Derivation prevents stale duplicated values and supports future Enrollment without changing the editor.

**Alternatives considered**:

- Editable current student count: rejected because it bypasses enrollment truth.
- Persist available seats independently: rejected because it can drift under concurrent enrollment.
- Auto-close lifecycle when full: rejected because capacity and lifecycle are separate operational facts.

## Money, Currency, and Installment Reconciliation

**Decision**: Represent money as non-negative decimal strings plus ISO currency code and configured precision. Plans choose amount-based or percentage-based installments consistently; reconciliation occurs in integer minor units or normalized percentage precision.

**Rationale**: Binary floating point is unsafe for financial equality. One mode per plan prevents ambiguous mixed totals. Currency and precision come from Organization & Settings.

**Alternatives considered**:

- JavaScript numbers as stored money: rejected due to rounding errors.
- Mixed amount and percentage entries within one plan: rejected because reconciliation and future collection meaning become ambiguous.
- Calculate real payment schedules: rejected as future Finance/Enrollment scope.

## Historical Financial Terms

**Decision**: Every accepted financial change produces an immutable `BatchFinancialRevision`; current detail references the latest revision. Future Enrollment must capture the applicable revision ID and terms snapshot.

**Rationale**: Later edits remain possible without rewriting historical student obligations. A stable revision is useful for audit, reporting, automation, and dispute review.

**Alternatives considered**:

- Freeze all batch finances after first enrollment: rejected because legitimate future corrections and future-effective changes may be required.
- Read historical enrollments from current batch price: rejected because it violates the explicit history rule.
- Delegate revision history entirely to future Enrollment: rejected because this module owns batch pricing changes and audit context.

## Lifecycle and Corrections

**Decision**: Implement a pure transition table with forward flow, narrowly defined correction transitions, readiness requirements, permission keys, confirmations/reasons, and optimistic version checks. Append one immutable event per successful transition.

**Rationale**: A centralized policy prevents screens and adapters from disagreeing. Corrections support real operations without allowing arbitrary state mutation. Archived remains read-only except historical retrieval.

**Alternatives considered**:

- Free status dropdown: rejected because it bypasses readiness and audit rules.
- Strictly forward-only lifecycle: rejected because erroneous registration closure/opening needs controlled correction.
- Delete/recreate incorrect batches: rejected because it destroys history and references.

## Readiness and Enrollment Eligibility

**Decision**: Expose pure typed results with stable reason codes. Registration readiness checks required schedule, capacity, finances, branches, active parent/dependencies, and current version. Enrollment eligibility additionally checks Registration Open, current registration window, available seats, active parent, and originating registration branch.

**Rationale**: Future Enrollment and UI can consume the same explainable decision without recreating rules. Reason codes support Arabic messages, automation, reporting, and AI context.

**Alternatives considered**:

- Boolean only: rejected because operations need actionable explanations.
- UI-only checks: rejected because future consumers and adapters need the same authoritative behavior.

## Permissions and Branch Scope

**Decision**: Use granular stable keys for list/detail and each mutation area. Effective branch scope comes only from employee context; services intersect queries and commands with authorized branch IDs. Mock checks are documented as UX simulation, not production security.

**Rationale**: Role names alone are insufficient. Service-level simulation catches direct-route and crafted-command gaps and maps cleanly to future backend authorization.

**Alternatives considered**:

- Hide navigation only: rejected because direct routes and commands remain exposed.
- Pass arbitrary scope from components: rejected because callers could broaden access.
- One `batches.manage` permission: rejected because finance, capacity, branches, and lifecycle require separation of duties.

## Query State, Cache, and Scale

**Decision**: TanStack Query keys are rooted at `['program-batches']`; normalized list queries include program and employee scope. Services own filtering, deterministic sorting, pagination, and totals. Mutations set returned detail and invalidate only affected lists/projections.

**Rationale**: Stable normalized keys avoid duplicate cache entries. Service-driven pagination supports 10,000+ summaries and future backend behavior without loading all records into components.

**Alternatives considered**:

- Filter fixtures in the page: rejected for scale and adapter migration.
- Invalidate the full application cache: rejected because it creates avoidable traffic and rerenders.
- Optimistic lifecycle transitions: rejected for this phase because readiness, versions, and audit events should be confirmed atomically.

## Form and Validation Architecture

**Decision**: Use one React Hook Form provider and composed Zod schema for the sectioned editor. Draft validation permits readiness gaps; opening registration runs separate domain readiness. Field errors map from typed service failures and dirty values survive failures.

**Rationale**: One authoritative schema avoids duplicate validation and cross-section inconsistency. Separate readiness preserves useful incomplete drafts.

**Alternatives considered**:

- Separate submit form per card: rejected because dependencies span schedule, finance, capacity, and branches.
- Validate registration readiness on every draft save: rejected because it prevents incremental work.
- Put validation in controls: rejected because reusable controls must not own business rules.

## Accessibility, RTL, and Responsive Behavior

**Decision**: Reuse shared components; use semantic sections/fieldsets, logical focus, error summary links, live feedback, focus-managed dialogs, keyboard-operable ordering, and non-color capacity/status labels. Use RTL layout with bidi isolation for codes, dates, money, and URLs. Tables scroll only within their viewport and editor sections stack on tablet.

**Rationale**: These are functional constitutional requirements and match the established platform interaction language.

**Alternatives considered**:

- Desktop-only wide editor/table: rejected because tablet is a supported target.
- Color-only capacity indicators: rejected for accessibility.
- Custom dropdown/table/dialog implementations: rejected because shared versions are mandated and already available.
