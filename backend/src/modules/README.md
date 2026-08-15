# Business module pattern

Business modules follow one direction only:

```text
controller.ts → service.ts → repository.ts → Prisma
                    ↑
                  dto/
```

- The controller declares transport concerns, DTOs, Swagger envelopes, and permissions. It contains no business rules.
- The service owns business rules, transaction boundaries, and domain-event emission.
- The repository extends `BaseRepository`; it is the only business-layer class allowed to receive `PrismaService`.
- DTOs use `class-validator`, map client field names exactly, and never expose server-owned fields.

Every endpoint is protected unless marked `@Public()`, every list is bounded and paginated, and every detail response includes computed record permissions. File handling uses the `STORAGE_SERVICE` token; business modules never import filesystem APIs or persist local paths.

## Identity and Organization ownership

Identity owns accounts, roles, permissions, authentication, sessions, and employee assignments.
Organization owns the legal/public organization profile, general settings, branches, departments,
academic years and terms, and configurable lookup groups/values. Organization may validate a manager
or check employee dependencies only through Identity's exported public reference service; it must not
import Identity repositories or query Identity tables. Downstream modules consume Organization master
data through exported read/resolution services and never import Organization repositories.
The `ORGANIZATION_MASTER_DATA_PORT` exposes bounded selectable branch, department, academic-year,
academic-term, and configurable lookup projections plus historical ID resolution. Consumers persist
only authoritative IDs and use this port to render archived labels; they never copy master rows.
Organization name and code are immutable legal identity after bootstrap. Academic-term ordering and
lookup catalogues are Organization-owned and are consumed only through exported public ports.

Academic Catalog owns product aggregates, fixed Product Type behavior, pricing, availability,
content, media descriptors, readiness, lifecycle, and immutable consumer snapshots. It consumes
Organization branches/departments/lookups and IAM instructors only through exported adapters.
Program Batches, Admissions, Students, and Finance must consume `CATALOG_PUBLIC_PORT`; they must not
query Catalog repositories or duplicate batchability rules. Consumer-owned enrollment/financial
snapshots are immutable copies and are never updated when the source product changes.

Identity is internally split into authentication, sessions, employees, roles/permissions, and
self-profile capabilities. Controllers bind validated DTOs and declare canonical permission keys;
services own security policy, optimistic concurrency, transactions, and events; Identity and core
authentication repositories own all account/session Prisma access. `AccountRole` and
`RolePermission` are explicit joins, and `RefreshToken` is the stable logical session record.

Configuration under `jwt`, `cookie`, and `passwordPolicy` controls credential TTLs, secure cookie
attributes, and password validation. The idempotent seed synchronizes permission definitions and
the initial administrator without duplicating assignments. Identity migrations preserve foundation
account and role IDs while backfilling the original single-role relationship.

## Academic Catalog ownership

Catalog owns academic products, the three fixed Product Type metadata records, pricing, branch
assignments, ordered content/media descriptors, readiness, eligibility, and lifecycle history.
Organization owns Business Categories, branches, departments, currency, study mode, and duration
units; Identity owns instructor employees; Storage owns uploaded bytes. Catalog communicates with
those modules only through public services and stores opaque reference IDs, never copied master rows.
Program Batches, Admissions, Students, and Finance consume Catalog read/capability/snapshot ports and
own their resulting business snapshots. No consumer imports Catalog repositories.
