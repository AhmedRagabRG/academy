# Architecture Validation

- Academic Catalog owns its routes, screens, forms, hooks, schemas, configuration, types, fixtures, services, components, and utilities.
- Route pages import only the public feature entry point and remain Server Components by default.
- Screens consume TanStack Query hooks; only the mock service imports catalog fixtures.
- Strict types cover IDs, versions, commands, projections, queries, lifecycle, readiness, eligibility, money, content, and assets without `any`.
- Product types and field applicability, categories, statuses, lookups, branches, departments, and permissions are service-managed records.
- RHF/Zod and shared Dropdown, Tiptap, upload, feedback, layout, status, and table systems are reused.
- Mock authorization is UX-only; organization and actor scope are absent from editable form commands.

Validated with ESLint, strict TypeScript, tests, and production build.
