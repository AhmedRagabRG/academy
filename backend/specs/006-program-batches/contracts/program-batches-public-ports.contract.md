# Public Port Contract: Program Batches

## Exported Program Batches Boundary

`PROGRAM_BATCHES_PUBLIC_PORT` is the only supported in-process boundary for Admissions, Students, Finance, reporting, and future consumers. Consumers must not import repositories or reproduce lifecycle, capacity, readiness, or financial rules.

Conceptual operations:

```text
resolveHistorical(batchId) -> BatchIdentityRecord | null
selectableForProgram(programId, branchId?, evaluationDate, page, pageSize)
  -> PageResult<BatchSelectionOption>
readiness(batchId) -> BatchReadiness
eligibility(batchId, branchId, evaluationDate) -> BatchEligibility
currentSelectionReference(batchId, branchId, evaluationDate) -> BatchSelectionReference
resolveFinancialRevision(batchId, financialRevisionId)
  -> ImmutableFinancialRevision | null
snapshotForSelection(batchId, branchId, evaluationDate)
  -> ImmutableBatchSelectionSnapshot
```

Rules:

- historical resolution includes archived identity but never makes it selectable;
- selection includes only registration-open, date-, branch-, and capacity-eligible batches;
- eligibility returns all refusal reasons and live seats;
- selection references include batch ID/version and financial revision ID;
- revision resolution verifies ownership and returns an immutable copy;
- consumer-owned snapshots never change after later Catalog/Batch edits;
- unavailable dependencies are distinguishable from empty results;
- scope is enforced unless caller is organization-wide;
- Prisma records and internal scaled values never cross the port.

`BatchSelectionReference` contains batch/program/branch IDs, batch version, financial revision ID, available seats, and evaluation date. The immutable selection snapshot adds frozen labels, relevant schedule dates, branch label, and the complete canonical financial revision.

## Inbound Catalog Boundary

Program Batches consumes `CATALOG_PUBLIC_PORT` to:

- resolve product identity, label, status, Product Type, and fixed batchability;
- read current product pricing only to seed a new batch form;
- resolve archived product identity for historical display.

Only active `PROFESSIONAL_PROGRAM` records with `batchable=true` accept new batches. Program Batches never duplicates the type→batchability rule. Later product edits never mutate saved batch revisions. If a required capability is absent, extend the Catalog-owned public interface rather than importing a Catalog repository.

## Inbound Organization Boundaries

Program Batches consumes:

- `ORGANIZATION_MASTER_DATA_PORT` for academic years, branches, and `program-intakes`;
- a narrow Organization settings-defaults port for currency and precision.

New assignments require active data; historical resolution returns disabled labels. Intakes remain configurable lookups. Branch scope is mandatory. Schedule milestones are closed Batch-domain values derived from available schedule dates, not Organization rows.

## Inbound Enrollment Dependency Boundary

`BATCH_ENROLLMENT_DEPENDENCY_PORT` is implemented by future Admissions:

```text
currentStudents(batchId) -> Available<number> | Unavailable
hasActiveDependencies(batchId) -> Available<boolean> | Unavailable
```

Rules:

- unavailable is never converted to zero/false;
- capacity reads, maximum reductions, readiness, eligibility, and archive use live values;
- mutations abort without writes when unavailable;
- a pre-Admissions known-empty implementation is allowed in development/test only and remains replaceable;
- production requires an authoritative provider before enrollment traffic is enabled;
- future enrollment creation coordinates its capacity guard atomically with Admissions persistence to prevent oversubscription.

## Snapshot Ownership

```text
Catalog defaults ──copy/seed──→ Batch financial revision
Batch revision ──copy/pin─────→ Admissions selection snapshot
Admissions snapshot ──────────→ Enrollment/Finance records
```

Every arrow is a one-way immutable value transfer. No source edit mutates an existing consumer record.
