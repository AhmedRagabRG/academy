# Performance Validation

- The production build prerenders static settings routes; only parameterized detail routes render on demand.
- Client boundaries are limited to interactive forms, tables, navigation, and query consumers.
- Entity-scoped TanStack Query keys keep mutation invalidation targeted.
- Service pagination and table selection reconciliation keep large lists bounded and predictable.
- Controlled query state and stable columns avoid duplicate state and unnecessary table work.
- Responsive coverage includes desktop, laptop, tablet, and 200% zoom.

Validated on 2026-07-31 with lint, strict TypeScript, Vitest, Next production build, and Playwright.
