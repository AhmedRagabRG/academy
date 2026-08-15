# Data Model: Academic Catalog

All identifiers are opaque immutable IDs. Every mutable aggregate carries `organizationId`,
`version`, `createdAt`, `createdBy`, `updatedAt`, and `updatedBy`. Times are ISO instants; ordering
uses explicit integer positions. Historical relationships resolve inactive and archived labels.

## Shared Value Objects

### Audit Metadata

- Organization ID, version, creator/updater IDs, creation/update times
- `version` increases exactly once for each successful aggregate mutation
- Future commands derive organization and actor from execution context, never editable form fields

### Money Reference

- Non-negative decimal amount and organization currency code
- Catalog reference only; no tax, stacking, eligibility, installment schedule, or final charge
- Precision and maximum value follow configured organization money policy

### File Asset

- ID, kind, file name, MIME type, byte size, reference/preview URL, accessible label, position, status
- Kinds include primary image, gallery image, brochure, and marketing media reference
- Pending local files remain transport-neutral descriptors and never become fixture imports in UI

### Configured Option

- Stable key/ID, localized label, status, display order, optional behavior metadata
- Used for duration units, study modes, statuses, fee definitions, and other catalog choices

## Product Type

Represents an organization-configurable offering classification.

**Fields**:

- ID, organization ID, Arabic name, English name, description, status, display order
- Ordered academic field definitions
- Audit metadata and version

**Academic Field Definition**:

- Stable field key from the service-owned supported catalog
- Visible flag, required-for-activation flag, display order, optional constraints
- Supported keys: duration, duration unit, term count, session count, hour count, study mode,
  training included, internship included, certificate included, final project required

**Validation and lifecycle**:

- Names are normalized and unique per organization.
- At least one localized name is required; default seeds contain both.
- Active ↔ Inactive; Active/Inactive → Archived; Archived → Active via explicit reactivation.
- Inactive/archived types remain resolvable on products but cannot be newly assigned.
- Definition changes never silently delete product academic values; newly required gaps block activation.

## Category

Groups related educational products.

**Fields**: ID, organization ID, Arabic name, English name, description, status, display order,
audit metadata, version.

**Validation and lifecycle**:

- Normalized names are unique per organization.
- Active ↔ Inactive; Active/Inactive → Archived; Archived → Active through reactivation.
- Historical product links persist; only active categories are assignable.

## Academic Product

The versioned consistency aggregate and canonical source of truth for one educational offering.

**Identity and classification**:

- ID, organization ID, official name, Arabic name, English name, normalized unique product code
- Product type ID, category ID, optional department ID, description
- `codeLockedAt` after first successful activation

**Owned sections**:

- Academic Profile
- Pricing Profile
- Branch Availability collection
- Sales Content
- Marketing Content and File Assets
- Lifecycle Event collection

**Lifecycle**: Draft, Active, Hidden, Closed, Archived.

**Validation**:

- Draft save requires identity sufficient to retain the record: official name, unique code, type,
  and category. Activation applies all readiness rules.
- Type/category must be active for new assignment; optional department must be active.
- Code is trimmed and case-normalized, unique across all statuses, editable in Draft until first
  activation, and immutable afterward.
- Archived products are read-only and permanently unavailable to new enrollment in this phase.

## Academic Profile

Product-owned values interpreted against the selected Product Type definitions.

**Fields**:

- Optional duration and duration-unit ID
- Optional positive term, session, and hour counts
- Optional study-mode ID
- Training, internship, certificate, and final-project boolean values where applicable
- Retained incompatible values pending explicit confirmation after a type change

**Validation**:

- Visible applicable fields are accepted; required applicable fields must be complete for activation.
- Counts and duration are positive and bounded by configured policies.
- Changing type requires confirmation before incompatible values are removed; no silent pruning.

## Pricing Profile

Current catalog reference pricing for one product.

**Fields**:

- Base price; registration, certificate, training, card, examination, and additional fee items
- Discount and scholarship reference items
- Installment-available indicator
- Organization currency code and optional administrative change reason

**Validation**:

- Amounts are non-negative and within configured bounds.
- Currency equals current organization catalog currency.
- No derived value is represented as a finalized enrollment charge.
- Each update records prior/new context in future-ready append-only price history.

## Product Branch Availability

An explicit relationship between product and branch.

**Fields**: Product ID, branch ID, role (`registration | study | general`), association status,
created metadata.

**Rules**:

- A branch may have more than one role; duplicate product/branch/role associations are prohibited.
- Only active branches may be newly associated; historical inactive links remain readable.
- Activation requires at least one active registration branch and one active study branch.
- `enrollmentEligible(product, branch)` is true only when product is Active, branch is active, and
  an active registration association exists. Hidden, Draft, Closed, and Archived are ineligible.

## Sales Content

Reusable admissions and customer-service guidance owned by a product.

**Fields**:

- Rich sales script
- Ordered FAQ records: ID, question, answer, position
- Ordered admission requirements: ID, text, position, status
- Ordered required documents: ID, title, description, mandatory flag, position, status

**Validation**: Stable child IDs, unique positions within each collection, non-empty visible content,
and configured length limits. Optional for Draft unless future type configuration marks an item required.

## Marketing Content

Reusable promotion metadata owned by a product.

**Fields**: Landing-page URL/reference, ordered images/gallery, ordered video references, brochure,
accessible labels, and optional localized captions.

**Validation**: Valid allowed URLs; allowed MIME/extension/size/count policies; meaningful accessible
label or explicit decorative designation; unique stable asset IDs and positions.

## Product Lifecycle Event

Append-only transition history.

**Fields**: ID, product ID, from status, to status, actor ID, time, required reason/context for
restrictive transitions, product version.

**Transition table**:

| From | Allowed destinations | Requirements and effect |
|---|---|---|
| Draft | Active, Archived | Active requires full readiness; Archived requires confirmation/reason |
| Active | Hidden, Closed, Archived | Restrictive transitions require confirmation/reason; enrollment stops |
| Hidden | Active, Closed, Archived | Reactivation revalidates readiness; others require reason |
| Closed | Active, Archived | Reactivation revalidates readiness; archive requires reason |
| Archived | None | Terminal/read-only in this phase |

Only Active is eligible for new enrollment. Visibility for future public consumers is distinct:
Hidden is internal-only; Closed and Archived remain internal historical records.

## Read Projections

### Product Summary

ID, multilingual display name, isolated code, type/category/department summaries, primary image,
reference base price/currency, branch summary, status, activation-readiness summary, updated time,
version, and permission-aware available actions.

### Product Detail

The full product aggregate plus resolved current/historical labels, section access metadata,
activation-readiness findings, lifecycle history, and effective action permissions.

### Activation Readiness

- `ready` boolean
- Ordered missing/invalid findings with section, stable field key, and safe message key
- Evaluated product version and time

### Enrollment Eligibility

- Product ID, branch ID, `eligible` boolean
- Stable reason code such as product-not-active, branch-inactive, or registration-not-assigned
- Evaluated product and branch versions

## List Query Model

- Trimmed search over normalized product code and official/Arabic/English names
- Multi-value filters: type IDs, category IDs, department IDs, branch IDs, status keys
- Allowlisted sort field and direction; immutable ID is the deterministic secondary sort
- One-based page and bounded page size
- Result: items, total, page, page size, total pages, optional service-derived facet counts
- URL serialization is stable; changed criteria reset page and returned totals clamp invalid pages

## Relationship Summary

- Product Type 1 → many Academic Products
- Category 1 → many Academic Products
- Department 0..1 → many Academic Products (external Organization & Settings reference)
- Academic Product 1 → 1 Academic Profile, Pricing Profile, Sales Content, Marketing Content
- Academic Product 1 → many Product Branch Availability records and Lifecycle Events
- Branch 1 → many Product Branch Availability records (external Organization & Settings reference)
- Academic Product 1 → many ordered FAQs, requirements, required documents, and assets
