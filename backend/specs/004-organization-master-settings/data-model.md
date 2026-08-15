# Data Model: Organization & Settings

## Conventions

- All identifiers are UUIDs.
- Business timestamps are UTC `timestamptz`; academic calendar values are PostgreSQL `date`.
- Mutable aggregates carry `version`, `createdAt`, `createdBy`, `updatedAt`, and `updatedBy`.
- Archivable records carry `status` (`ACTIVE`, `INACTIVE`, `ARCHIVED`) and nullable `archivedAt`.
- Normalized codes remain reserved across every status and are compared after trim/case folding.
- Prisma relationships and indexes are declared in `schema.prisma`; partial and exclusion constraints
  are added in the reviewed migration where Prisma cannot express them.
- External IDs are validated through the owning module's public service and do not create cross-module
  repository access.

## Organization

The single legal/public organization aggregate.

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Primary key |
| singletonKey | string | Fixed `PRIMARY`; unique and database-checked |
| code | string | Required, normalized unique, immutable after setup |
| name | string | Required, immutable after setup |
| logo | safe file descriptor JSON, nullable | Image descriptor only; no path |
| favicon | safe file descriptor JSON, nullable | Image descriptor only; no path |
| cover | safe file descriptor JSON, nullable | Image descriptor only; no path |
| website | string, nullable | Absolute HTTP(S) URL |
| address | string, nullable | Trimmed public address |
| workingHours | JSON | Documented bounded weekly-hours structure |
| version/audit fields | standard | Profile aggregate concurrency and attribution |

**Relationships**: one GeneralSettings; many OrganizationContact; many OrganizationSocialLink;
many Branch, Department, AcademicYear, LookupGroup.

**Immutability**: `code` and `name` never appear in the update input. Unknown immutable fields are
rejected rather than ignored.

## OrganizationContact

Ordered email/phone contact within the Organization aggregate.

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Stable child ID |
| organizationId | UUID | Required parent; cascade only for environment teardown, no public delete |
| type | `EMAIL \| PHONE` | Closed union |
| label | string | Required, trimmed |
| value | string | Valid email or international phone by type |
| isPrimary | boolean | At most one primary per organization/type |
| sortOrder | integer | Non-negative |

Indexes: `(organizationId,type,sortOrder)`; partial unique `(organizationId,type)` where primary.
Service validation requires one primary for every non-empty contact type.

## OrganizationSocialLink

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Stable child ID |
| organizationId | UUID | Required parent |
| platform | string | Required normalized label; unique within organization |
| url | string | Absolute HTTPS URL |
| sortOrder | integer | Non-negative |

## GeneralSettings

One-to-one operational settings aggregate.

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Primary key |
| organizationId | UUID | Unique required parent |
| defaultLanguage | string | Must belong to supported settings feed |
| timeZone | string | Valid supported IANA zone |
| currency | string | Supported ISO 4217 code |
| dateFormat | string | Closed supported format |
| numberFormat | string | Closed supported locale/format |
| workingDays | string[] | Non-empty subset of unique weekday codes |
| defaultBranchId | UUID | Required active Branch in same organization |
| defaultAcademicYearId | UUID | Required active AcademicYear in same organization |
| version/audit fields | standard | Required expected-version updates |

Settings update is one-row atomic. Academic-year activation updates `defaultAcademicYearId` in the
same transaction so the default and active status cannot disagree.

## Branch

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Primary key |
| organizationId | UUID | Required owning organization |
| name | string | Trimmed, minimum 2 |
| normalizedName | string | Arabic/case normalized search value |
| code | string | Trimmed uppercase, 2–12, unique per organization across statuses |
| address | string | Trimmed, minimum 3 |
| phone | string | 8–15 digits with optional leading plus |
| email | string | Valid normalized email |
| managerId | UUID, nullable | External Identity account reference |
| workingHours | string | Trimmed, minimum 3 |
| status/archive/version/audit | standard | No permanent delete |

Constraints/indexes: unique `(organizationId,code)`; indexes on status, normalizedName, updatedAt,
managerId. Manager eligibility is validated through Identity public services.

Transitions: ACTIVE ↔ INACTIVE; ACTIVE/INACTIVE → ARCHIVED; ARCHIVED → ACTIVE only through the
explicit status action after dependency/eligibility validation. Archive is refused while active
Identity or future module references exist.

## Department

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Primary key |
| organizationId | UUID | Required owner |
| name | string | Trimmed, minimum 2 |
| normalizedName | string | Arabic/case normalized search value |
| code | string | Required normalized unique per organization across statuses |
| description | string | Trimmed, minimum 3 |
| status/archive/version/audit | standard | No permanent delete |

Constraints/indexes: unique `(organizationId,code)`; indexes on status, normalizedName, updatedAt.
Archive is refused while active Identity or future module references exist.

## AcademicYear

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Primary key |
| organizationId | UUID | Required owner |
| name | string | Required, trimmed |
| normalizedName | string | Search value |
| code | string | Required normalized unique per organization across statuses |
| startDate | date | Required |
| endDate | date | Required; on/after start |
| status/archive/version/audit | standard | Explicit activation action |

Relationships: many AcademicTerm; referenced by GeneralSettings.

Constraints/indexes:

- unique `(organizationId,code)`;
- check `endDate >= startDate`;
- partial unique index allowing only one row per organization where `status='ACTIVE' AND archivedAt IS NULL`;
- indexes on status, startDate, normalizedName.

Transitions: creation defaults inactive unless bootstrapping the first year; activation atomically
inactivates the old active year and updates GeneralSettings; archived years cannot activate; the last
active year cannot be directly inactivated or archived.

## AcademicTerm

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Primary key |
| organizationId | UUID | Same as parent, retained for ownership/indexing |
| academicYearId | UUID | Required parent, restrict delete |
| name | string | Required, trimmed |
| normalizedName | string | Search value |
| startDate | date | Required, within parent |
| endDate | date | Required, on/after start and within parent |
| order | positive integer | Unique and contiguous across every retained sibling in the year |
| status/archive/version/audit | standard | Historical retention |

Constraints/indexes:

- check `endDate >= startDate`;
- check `order > 0`;
- deferrable unique constraint `(academicYearId,order)` covering every status;
- service-level invariant under the parent-year lock: order set is exactly `1..N`;
- service and transaction check parent containment;
- GiST exclusion `(academicYearId WITH =, daterange(startDate,endDate,'[]') WITH &&)` using
  `btree_gist`, covering all statuses to protect historical calendar truth;
- indexes on `(academicYearId,status,startDate)`, normalizedName, updatedAt.

The API returns `academicYearName` resolved from the parent; clients never author it. Touching date
boundaries overlap because ranges are inclusive. Create inserts and shifts later siblings. Updating
order performs an atomic interval move. Moving between years compacts the source and inserts into the
destination. Archive/reactivation preserve order because archived terms remain retained sequence
members; status-filtered lists may therefore show gaps while the complete year catalogue is `1..N`.

## LookupGroup

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Primary key |
| organizationId | UUID | Required owner |
| code | string | Stable normalized unique per organization across statuses |
| name | string | Required display name |
| normalizedName | string | Duplicate/search value |
| parentGroupId | UUID, nullable | Optional taxonomy parent; no cycles |
| status/archive/version/audit | standard | Historical retention |

Constraints/indexes: unique `(organizationId,code)` and normalized name; self-reference uses restrict;
indexes on status/name. Archive is refused while non-archived values or child groups exist.

## LookupValue

| Field | Type | Rules |
|-------|------|-------|
| id | UUID | Primary key |
| lookupGroupId | UUID | Required group, restrict delete |
| parentValueId | UUID, nullable | Must belong to configured parent group; no cycles |
| name | string | Required display label |
| normalizedName | string | Unique within group after normalization |
| code | string | Required normalized stable code |
| sortOrder | integer | Non-negative; ties allowed |
| status/archive/version/audit | standard | Historical retention |

Constraints/indexes: unique `(lookupGroupId,code)` and `(lookupGroupId,normalizedName)`; indexes on
`(lookupGroupId,status,sortOrder)`, parentValueId. Deterministic order is `sortOrder`, normalizedName,
ID. Archive is refused while non-archived child values exist. Reorder updates all supplied values and
the owning group version in one transaction.

## External Reference Boundaries

| Reference | Owner | Validation/dependency mechanism |
|-----------|-------|---------------------------------|
| Branch.managerId | Identity | Exported account-reference service; active eligible account required |
| Branch employee assignments | Identity | Identity dependency query before archive |
| Department employee assignments | Identity | Identity dependency query before archive |
| Future student/catalog/finance references | Owning future module | Public dependency service registered through module composition |
| Asset descriptors | Storage | Generic upload occurs first; Organization validates/persists descriptor only |

No Organization repository imports or queries another module's models.

## Transaction Boundaries

1. **Academic-year activation**: serializable transaction; lock/recheck current active/default; version
   check target; inactivate old; activate target; update GeneralSettings; commit; emit event.
2. **Term create/update/move**: serializable transaction locks affected parent years in stable ID
   order; validates year/term versions, containment, sibling ranges, requested position, and `1..N`;
   shifts or permutes rows under deferred uniqueness; exclusion/order constraints are final race guards.
3. **Profile update**: version-check Organization; replace/merge contact/social children; update safe
   descriptors/scalars; increment parent once; commit; emit one profile event.
4. **Lookup reorder**: validate group/version and exact member/version set; update positions; increment
   group once; commit; emit one reorder event.
5. **Archive/status operations**: dependency checks and versioned transition occur in the same
   transaction; failure changes nothing and emits no success event.

## Migration and Seed Strategy

1. Add `btree_gist` extension if absent.
2. Create Organization and owned tables without changing Identity-owned Account relations.
3. Create partial unique, exclusion, primary-contact, code/name, and query indexes explicitly.
4. Seed the singleton organization, one active branch, one department, one active academic year with
   non-overlapping terms, GeneralSettings, closed static settings standards, and approved lookup group
   codes/values idempotently.
5. Keep external Identity IDs nullable or resolve configured seed references; never invent cross-module
   foreign keys.
6. Verify fresh deployment, repeated seed, concurrent year activation, concurrent term overlap, and
   rollback reconstruction before release.
