# Quickstart: Validate Academic Catalog

## Implementation Validation

- Routes, navigation, taxonomy, unified editor, lifecycle, eligibility, content, media, and deterministic mock services are implemented.
- Mock permissions affect UI affordances only and are not a production authorization boundary.
- A backend adapter can replace the mock service without changing route pages or presentational UI.
- Program Batches should consume stable product IDs, versions, eligibility, and snapshots without importing fixtures or internal components.

## Prerequisites

- Node.js 20+ and npm 10.9+
- Application Foundation and Organization & Settings features available
- Dependencies installed from the repository root
- Academic Catalog implementation tasks completed

## Run and Quality Gates

```bash
npm install
npm run dev
```

Run the full gates from the repository root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Expected: every command succeeds, all required catalog routes build, and serious/critical axe
findings are zero.

## Scenario 1: Configure Product Types and Categories

1. Open `/academic-catalog/product-types` with taxonomy-management permission.
2. Create a type with ordered applicable academic fields and activation requirements.
3. Create a category; search, sort, filter, paginate, edit, deactivate, archive, and reactivate it.
4. Assign both to a draft product, then deactivate them.
5. Verify the product retains historical labels while inactive values disappear from new assignments.
6. Change type requirements and verify existing values are retained while readiness reports new gaps.

Expected: seeded types behave as editable records; no product/category/type permanent delete exists.

## Scenario 2: Create, Validate, and Edit a Product

1. Open `/academic-catalog/products/create`.
2. Enter identity/classification and save an incomplete Draft.
3. Attempt duplicate and malformed codes, invalid money, invalid URLs, and non-positive academic values.
4. Select different product types and verify applicable fields come from configuration.
5. Change type after entering incompatible values; cancel and confirm the explicit discard workflow.
6. Complete all sections, save, reload the canonical detail/edit route, and verify the returned version.
7. Simulate a stale version and verify unsaved values plus compare/reload/retry guidance remain available.

Expected: one sectioned form preserves dirty data, maps field errors, and never imports fixture data.

## Scenario 3: Pricing, Availability, and Eligibility

1. Set base/reference fee values and installment availability using the organization currency.
2. Verify negative, out-of-range, or foreign-currency values are rejected.
3. Assign distinct active registration, study, and general branch sets.
4. Attempt to activate without registration or study availability and verify readiness findings.
5. Activate, then verify eligibility is true only at active assigned registration branches.
6. Hide, close, and archive the product and verify eligibility becomes false while history remains.
7. Confirm detail/history preserves price-change and branch association context.

Expected: no final charge, scholarship eligibility, stacking, payment, or installment schedule is calculated.

## Scenario 4: Sales Content and Marketing Assets

1. Add a Tiptap sales script, ordered FAQs, requirements, and required documents.
2. Add primary/gallery images, a brochure, video/landing references, and accessible labels.
3. Reorder content/assets by keyboard, remove an item, and verify order persists.
4. Submit an oversized, unsupported, duplicate, or unavailable asset reference.
5. Verify item-level feedback and that all other unsaved form values remain intact.
6. Review the saved content from the product detail route with content-only and media-only permissions.

Expected: structured content and transport-neutral asset metadata remain reusable by future modules.

## Scenario 5: Discovery, Lifecycle, Permissions, and Scale

1. Seed or enable the deterministic 10,000-product mock scenario.
2. Combine Arabic/English/code search with type, category, department, branch, and status filters.
3. Sort, paginate, change criteria, verify page reset/clamping and stable result totals, then deep-link/reload.
4. Exercise allowed row and bulk lifecycle actions; verify invalid transitions and archive confirmation.
5. Test super-admin, executive, branch, marketing, and customer-service permission projections.
6. Verify branch-manager queries and mutations cannot escape authorized branch scope.
7. Reproduce latency, empty, unavailable, retryable, forbidden, duplicate, conflict, dependency,
   activation, media, and unexpected error modes.

Expected: a known product is discoverable in under 30 seconds and no UI operation requires loading
the entire catalog into a component.

## Scenario 6: RTL, Responsive, and Accessibility

Validate overview, list, create, detail, edit, taxonomy, media, confirmation, and error states at
approximately 1440, 1024, and 768 px plus 200% zoom in light and dark themes.

- Complete primary workflows by keyboard only.
- Verify heading/fieldset/table semantics, section navigation, first-error focus, dialog focus
  trap/cancel/return, live feedback, accessible media alternatives, and reorder controls.
- Verify Arabic RTL layout and Alexandria typography; isolate codes, money, dates, and URLs correctly.
- Ensure only table viewports scroll horizontally and sticky editor actions do not cover content.
- Run automated axe checks and manually review representative flows with a screen reader.

Expected: primary workflows remain operable and understandable with no serious/critical violations,
page-level overflow, missing actions, or trapped focus.

## Contract References

- Domain rules and transitions: [data-model.md](./data-model.md)
- Service, query, UI, permission, media, and error boundaries:
  [academic-catalog-contracts.md](./contracts/academic-catalog-contracts.md)
- Research rationale and rejected alternatives: [research.md](./research.md)
