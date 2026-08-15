# Alsalam AI Operations Platform

Arabic-first frontend foundation for education operations. The repository is an npm/Turborepo
workspace with a Next.js application in `apps/web` and application-agnostic UI primitives in
`packages/ui`.

## Requirements

- Node.js 20 or later
- npm 10.9.x

## Development

```bash
npm install
npm run dev
```

The local mock login is for demonstration only:

- Email: `employee@alsalam.edu`
- Password: `demo1234`

Never reuse these values for real authentication or treat client-side session and permission
filtering as a security boundary.

### Admissions module

Admissions routes are `/admissions`, `/admissions/create`, `/admissions/[admissionId]`, and
`/admissions/[admissionId]/edit`. Access is modeled with 18 `admissions.*` permissions, but the
current authentication and authorization implementations remain frontend mocks.

Uploaded admission files use browser object URLs and in-memory metadata and are intentionally not
durable. The public Admissions boundary exposes minimal approval and enrollment-readiness DTOs for
future Student, Enrollment, and Finance adapters without creating those records in this phase.

## Architecture

- `apps/web/src/app`: App Router route groups and server-first route composition
- `apps/web/src/features`: feature-owned components, data, hooks, schemas, services, and types
- `apps/web/src/shared`: platform-aware shell, forms, tables, providers, services, stores, and utilities
- `packages/ui/src`: reusable shadcn/Base UI primitives and design tokens

Pages import feature public APIs. Only mock service adapters may import feature fixtures. TanStack
Query owns asynchronous state, focused Zustand stores own cross-feature client context, next-themes
owns appearance, and local React state owns transient interactions.

## Implemented Modules

- **Organization & Settings** supplies organization, branch, department, calendar, user, role, permission, and default configuration.
- **Academic Catalog** supplies configurable product types/categories, versioned educational products, academic delivery, reference pricing, branch eligibility, structured sales/marketing content, media metadata, and governed lifecycle through a replaceable mock service boundary. Future Program Batches consume public product IDs and versions rather than catalog fixtures or internal components.
- **Program Batches** supplies independent Professional Program intakes with schedules, capacity,
  registration/study branches, pricing, installments, offers, lifecycle history, and immutable
  financial revisions through a replaceable mock service boundary.

The seeded Program Batches route is
`/academic-catalog/programs/product-professional/batches`. Current permission and branch checks are
frontend simulations only; a future backend must enforce organization, tenant, branch, action,
capacity, and enrollment eligibility. Future Enrollment should consume the public eligibility
projection and capture its financial revision instead of reading mutable current pricing.

## Brand System

All interfaces follow the [Alsalam Academy brand identity](specs/001-application-foundation/brand-identity.md).
Shared semantic tokens enforce the navy, professional blue, gold-accent, background, typography,
radius, border, and shadow rules. Licensed DIN Next Arabic font files are not stored in this
repository; the CSS stack activates a locally available installation and provides a safe Arabic
fallback until approved webfont assets are supplied.

## Validation

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e -w web -- --project=desktop --project=laptop --project=tablet
```

The browser suite covers mock login, configuration-driven navigation, theme persistence, Arabic
RTL behavior, desktop/laptop/tablet layouts, shared component showcase flows, and axe accessibility
checks. Firefox and WebKit smoke projects are configured but require their Playwright browser
binaries to be installed.

## Adding UI Primitives

Run from the repository root:

```bash
npm dlx shadcn@latest add button -c apps/web
```

Keep atomic, application-agnostic primitives in `packages/ui`; keep platform-aware composites in
`apps/web/src/shared`.
