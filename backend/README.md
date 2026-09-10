# Al Salam Academy Backend

NestJS 11 and Prisma 7 foundation for the Al Salam Academy API. It provides validated configuration, PostgreSQL access, response envelopes, declarative authorization, secure credential primitives, local file storage, structured logging, Swagger, and health checks.

## Setup

1. Use Node.js 22 and PostgreSQL 14 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and replace every placeholder.
4. Create the database, then run `npm run prisma:generate && npm run prisma:migrate`.
5. Run `npm run seed` to create the initial internal role and administrator.

For a local PostgreSQL 16 instance, `docker compose up -d postgres` is available.

## Run

- Development: `npm run start:dev`
- Production build: `npm run build && npm run start:prod`
- Health: `GET http://localhost:3000/api/v1/health`
- Swagger (when enabled): `http://localhost:3000/api/docs`

## Test

Create a dedicated `alsalam_test` database and copy `.env.test.example` to `.env.test. Never point `.env.test` at development or production data; e2e tests may modify tables.

- Unit: `npm test`
- End to end: `npm run test:e2e`
- Lint: `npm run lint`
- Coverage: `npm run test:cov`

Identity integration tests run separately against PostgreSQL:

```bash
npx jest --runInBand --testRegex='test/integration/identity/.*\\.spec\\.ts$'
```

## Identity and access management

The Identity module owns employee authentication, independently revocable sessions, multi-role
RBAC, employee administration, and self-service profiles. Access and refresh JWTs are stored only in
httpOnly cookies; refresh rotation retains the logical session ID and uses a per-rotation nonce plus
hash compare-and-rotate to reject replay. Every protected request reloads active account, session,
role, and permission state so authorization changes apply immediately.

Self-service routes use `/api/v1/auth`; administrative users, roles, and permissions use
`/api/v1/settings`. The permission seed is the canonical 128-key amended catalogue. Employee and
role writes use optimistic versions, Arabic-normalized search fields, archival rather than deletion,
service-owned transactions, and post-commit domain events.

See [the IAM quickstart](specs/002-identity-access-management/quickstart.md) for its complete
acceptance checklist and [the foundation quickstart](specs/001-backend-foundation/quickstart.md) for
the shared platform checks.

## Organization and settings

The Organization module owns the immutable legal profile, editable branding/contact aggregate,
general defaults, branches, departments, academic years and non-overlapping terms, and configurable
lookup groups and values. Administration is exposed below `/api/v1/organization/profile` and
`/api/v1/settings/*`. Downstream modules consume lookup choices through the exported
`OrganizationLookupsService`; they never import Organization repositories or duplicate master rows.
The exported `ORGANIZATION_MASTER_DATA_PORT` provides bounded active choices and historical label
resolution for branches, departments, academic years, explicitly ordered terms, and lookup values.

PostgreSQL migrations enforce the singleton profile, normalized uniqueness, one active academic year,
one primary contact per type, and inclusive term non-overlap. The idempotent seed creates the initial
profile/settings, structure, calendar, and configurable master values.

## Meta Inbox channels

WhatsApp, Messenger, and Instagram configuration comes only from backend environment variables —
there is no in-app OAuth or account-linking flow. The Inbox accepts WhatsApp Cloud API and Facebook
Page Messenger events at `GET|POST /api/v1/inbox/meta/webhook`. Configure `META_APP_SECRET`,
`META_WEBHOOK_VERIFY_TOKEN`, `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`,
`META_WHATSAPP_BUSINESS_ACCOUNT_ID` (required for WhatsApp template sync),
`META_MESSENGER_PAGE_ACCESS_TOKEN`, `META_MESSENGER_PAGE_ID`, `META_INSTAGRAM_ACCESS_TOKEN`, and
`META_INSTAGRAM_ACCOUNT_ID`. Keep access tokens in the deployment secret manager.

Configure the same public HTTPS webhook URL in the Meta app for both products. Subscribe WhatsApp
to message events and Messenger to page messaging events. The GET request performs Meta's webhook
challenge; POST requests require a valid `X-Hub-Signature-256` signature. Run the Inbox migrations
and seed so the `whatsapp` and `messenger` platform records exist before enabling the webhook.

## Integration tests

```bash
cp .env.test.example .env.test   # point DATABASE_URL at a dedicated test database
npx prisma migrate deploy        # with DATABASE_URL from .env.test
npx tsx prisma/seed.ts           # the suite asserts against seeded data
npm run test:integration
```

The suite runs serially (`--runInBand`) because the specs share one seeded database.

> **Known state:** a number of these specs predate the removal of the academic/ERP
> modules and still reference dropped tables such as `Branch`. They fail against the
> current schema. They had no runner wired until now, so the drift went unnoticed —
> see `test/integration/inbox/inbox-behavior.spec.ts`, which calls `prisma.branch`.
> Treat a failure here as "this spec needs updating to the current domain", not as a
> regression, until they have been triaged.

## Vector search (pgvector)

`KnowledgeChunk.embedding` is a `vector(1536)` column with an HNSW index, both created
in `prisma/migrations/20260910130000_knowledge_chunks`. Prisma cannot model either, so:

- `prisma migrate diff` always reports `[-] Removed index on columns (embedding)`.
  That is expected drift, not a schema error.
- **`prisma migrate dev` will propose dropping the HNSW index. Never accept that.**
  Retrieval still returns correct results without it, by sequential scan, so the
  regression is invisible until the knowledge base grows.

Dimensions are pinned to 1536 rather than `text-embedding-3-large`'s native 3072
because pgvector's HNSW implementation caps at 2000; OpenAI performs the truncation
natively via the `dimensions` parameter.
