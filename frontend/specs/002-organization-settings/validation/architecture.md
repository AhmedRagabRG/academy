# Architecture Validation

- The feature owns its types, schemas, forms, hooks, fixtures, services, components, screens, and utilities.
- Pages are thin route adapters and never import fixtures; all data crosses the typed service contract.
- Fixtures remain behind the mock service and can be replaced without changing screens.
- Domain models, mutation inputs, errors, permissions, and pagination are strictly typed without `any`.
- Forms share React Hook Form and Zod; lists share TanStack Table; selects share the branded Dropdown.
- The service enforces versions, uniqueness, reference state, calendar rules, active defaults, and last-administrator continuity.
- Settings navigation is configuration-driven, nested, and permission-aware.

Validated on 2026-07-31 with lint, type checking, tests, production build, and browser journeys.
