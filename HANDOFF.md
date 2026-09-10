# AI Agent System — Engineering Handoff

**Branch:** `feat/ai-agent-foundation` (8 commits, **nothing pushed**)
**Base:** `c4f1bf4` on `main`
**Repo:** `/home/ubuntu/share/academy` — `backend/` (NestJS 11 + Prisma 7 + PostgreSQL 18.6) and
`frontend/` (Turborepo + Next.js 16 at `frontend/apps/web`, Arabic/RTL)
**Full plan:** `/home/ubuntu/.claude/plans/you-are-working-inside-toasty-journal.md` — read it; it
contains the approved 16-section architecture and a live "Execution Status" section.

---

## 1. Commits so far (newest first)

| Hash | What |
|---|---|
| `2f72194` | Phase 2 — KB ingestion + pgvector retrieval |
| `fc2733d` | Fix: numeric env vars rejected when actually set |
| `19faeaa` | Phase 4b — resume sweeper, AI control endpoint, inbox UI |
| `6de6339` | **Phase 4a — human takeover safety net (the critical one)** |
| `0412875` | Wired a runner for the previously unreachable integration suite |
| `3c270b0` | Phase 3 — AI schema, service account, message author type |
| `7ab8eb0` | Phase 1 — AI infrastructure, inert by default |
| `cb31fa4` | Phase 0 — committed the untracked teardown migration |

**Only uncommitted change:** `D frontend/apps/web/.env.example` — this deletion **pre-existed**
this branch. Leave it alone; it is not ours.

---

## 2. Phase status

| Phase | State |
|---|---|
| 0 — commit pending migration | **DONE** |
| 1 — infra (Redis/BullMQ/OpenAI/pgvector prep) | **DONE**, inert by default |
| 2 — Knowledge Base **backend** | **DONE** |
| 3 — AI schema + service account + authorType | **DONE** |
| 4 — human takeover | **DONE**, mutation-tested |
| **5 — agent runtime + KB frontend** | **NOT STARTED — you start here** |
| 6 — write tools (CRM, ticket escalation) | Not started |
| 7 — observability, hardening, rollout | Not started |

---

## 3. Architecture decisions (all approved by the project owner — do not relitigate)

1. **Single agent with tools, wrapped in a deterministic state machine.** Not multi-agent. The
   state machine (S1–S5 below) is plain TypeScript; the LLM has no say in eligibility, pausing,
   fencing, or dispatch. Rejected supervisor/multi-agent as complexity without benefit.
2. **Redis + BullMQ** for AI jobs (new infra, added in Phase 1).
   *Exception:* the auto-resume sweeper deliberately does **not** use a BullMQ delayed job —
   durable business state must not live in Redis, where a flush loses every pending resume
   silently. It is a Postgres-backed `setInterval` sweeper copying `CampaignDispatcherService`.
3. **pgvector in the existing Postgres**, dimensions pinned to **1536**.
4. **OpenAI** for both chat and embeddings.
5. **Branch routing deferred to Phase 2-of-product.** The `Branch` table was dropped by migration
   `20260909164212`. MVP routes tickets by `TicketTeam` only.
6. **The AI acts as a real restricted `Account`**, never a fabricated `CallerContext`. This is a
   security decision: a synthetic caller that passes `policy.assert` is a privilege-escalation
   primitive, and `InboxMessage.createdBy` has no FK so a fake id would dangle forever.
7. **Prefer explicit application tools over DB access.** Every AI action goes through an existing
   domain service (`ContactService`, `TicketService`, `InboxService`).
8. Backend obeys `backend/.specify/memory/constitution.md`. Load-bearing: `Controller → Service →
   Repository → Prisma`; **only repositories import Prisma**; no duplicated business rules;
   `docs/api-data-requirements.html` is the wire contract and must be updated with every endpoint.

---

## 4. The human-takeover architecture (READ BEFORE TOUCHING THE INBOX)

This is the safety-critical core. **Do not modify these without re-running the concurrency suite.**

### State

`ConversationAiState` (1:1 with `InboxConversation`, **owned by the inbox module, not the AI
module** — the pause must be atomic with the human's message insert):

- `mode`: `AUTO | PAUSED | OFF`
- `pausedReason`: `HUMAN_REPLY | MANUAL | ESCALATED | HANDOFF | ERROR_BUDGET`
- `resumeAt`: null while PAUSED means **never** auto-resume
- **`turnSeq`** — the fencing token. Internal only. **Never expose it to clients and never use it
  as `expectedVersion`.**
- `version` — the separate, client-facing optimistic-concurrency counter for pause/resume.

> **Why not reuse `InboxConversation.version`?** It is bumped by `assign()`, `changeStatus()` and
> tag toggles, so an agent merely tagging a conversation would silently kill a valid AI turn. It
> is also the field the constitution designates for client `expectedVersion`.

### Three independent guards in `InboxService.sendAiReply()`

1. **`retryToken = \`ai:${aiTurnId}\``** — byte-stable across BullMQ retries, against the existing
   `@@unique([conversationId, retryToken])`. A retry of a turn whose row already committed
   **does not re-decide whether to speak**; it only re-attempts dispatch.
2. **Fencing guard inside the commit transaction** — `updateMany({ where: { turnSeq: expected,
   mode: 'AUTO', conversation alive } })` must affect exactly 1 row. If it does not, the whole
   transaction rolls back and **no message row exists at all**; the generated text is discarded
   unseen.
3. **Dispatch guard immediately before the provider call** (`claimAiDispatch`) — one atomic
   `UPDATE "AiTurn" SET "dispatchStartedAt" = now() WHERE ... IS NULL AND EXISTS(...)`, mirroring
   `CampaignDispatcherService.markRequestStarted`. Commit and network call cannot be atomic, so
   this shrinks the residual window to ~1 statement. **Losing it sets the message to
   `delivery = 'SUPPRESSED'` rather than deleting it** — an agent may already have seen it.

### Hard requirements that must never regress

- **The `turnSeq` increment in `MetaWebhookService.persist()` MUST stay inside the existing
  `$transaction`.** A duplicate Meta delivery aborts on `providerMessageId` and rolls the
  increment back for free. Moved to a post-commit hook it double-increments and silently fences
  out valid turns. There is a unit test asserting the transaction boundary itself (the mock
  records the transaction window — call ordering alone cannot distinguish "last statement inside"
  from "first statement after").
- **`sendAiReply` takes no `CallerContext`** — it is unreachable from any controller by design.
- **An AI reply must not clear `unreadCount`.** A human replying implies a human read the thread;
  an AI reply does not. `persistOutbound` branches on author for this.
- **Manual resume increments `turnSeq`**, so a turn in flight when the pause happened is still
  fenced out afterwards.

### Files that implement this — treat as protected

- `backend/src/modules/inbox/inbox.service.ts` — `persistOutbound`, `pauseAiForHuman`,
  `sendAiReply`, `claimAiDispatch`, `setAiMode`, `getAiState`, `AiTurnSuppressed`, `OutboundAuthor`
- `backend/src/modules/inbox/inbox.repository.ts` — `forSystem(id)` (deliberately unscoped; no
  caller exists in the AI pipeline)
- `backend/src/modules/inbox/meta/meta-webhook.service.ts` — the in-transaction `turnSeq` increment
- `backend/src/modules/ai/runtime/ai-resume.sweeper.ts`
- `backend/test/integration/inbox/ai-takeover.spec.ts` — **10 tests. Never weaken or skip these.**

---

## 5. Database & Prisma

### Migrations added on this branch

| Migration | Contents |
|---|---|
| `20260909164212` (Phase 0) | Pre-existing teardown, previously untracked. **Folder deliberately has no `_description` suffix** — Prisma matches applied migrations by folder name and this name is already recorded in `_prisma_migrations` on deployed environments. **Renaming it would re-run ~68 table drops.** |
| `20260910120000_ai_agent_foundation` | 8 new tables, `InboxMessage.authorType` + `aiTurnId`, 2 new `InboxMessageDelivery` values, partial index for the sweeper |
| `20260910130000_knowledge_chunks` | `CREATE EXTENSION vector`, `KnowledgeChunk`, HNSW index |

### New tables

`KnowledgeBase`, `KnowledgeSource`, `KnowledgeChunk`, `AiAgent`, `AiAgentKnowledgeBase`,
`AiTicketRoutingRule`, `ConversationAiState`, `AiTurn`, `AiToolExecution`.

### New enums

`InboxMessageAuthor(CUSTOMER|HUMAN_AGENT|AI_AGENT)`, `AiMode`, `AiPauseReason`, `AiTurnStatus`,
`AiToolOutcome`, `KnowledgeSourceKind`, `KnowledgeSourceStatus`, `KnowledgeVisibility`.
`InboxMessageDelivery` gained `SUPPRESSED` and `UNCERTAIN`.

### The authorType backfill (already applied to live)

Staged deliberately — a single `ADD COLUMN NOT NULL DEFAULT` would have mislabelled every inbound
row:
```sql
ALTER TABLE "InboxMessage" ADD COLUMN "authorType" "InboxMessageAuthor";
UPDATE "InboxMessage" SET "authorType" =
  (CASE WHEN direction='INCOMING' THEN 'CUSTOMER' ELSE 'HUMAN_AGENT' END)::"InboxMessageAuthor";
ALTER TABLE "InboxMessage" ALTER COLUMN "authorType" SET NOT NULL;
ALTER TABLE "InboxMessage" ALTER COLUMN "authorType" SET DEFAULT 'HUMAN_AGENT';
ALTER TABLE "InboxMessage" ADD CONSTRAINT "inbox_message_ai_turn_consistent"
  CHECK (("authorType"='AI_AGENT') = ("aiTurnId" IS NOT NULL));
```
> The explicit `::"InboxMessageAuthor"` cast is **load-bearing**. Without it PostgreSQL errors
> `42804` — a `CASE` returns `text` and will not implicitly cast to an enum on assignment. This
> was caught only by replaying against a real database; it would have failed on live.

`MetaWebhookService.persist()` sets `authorType: 'CUSTOMER'` explicitly. Without that line the
column default (`HUMAN_AGENT`) would mislabel every **future** inbound message.

---

## 6. pgvector / HNSW — and the Prisma trap

- Server: **PostgreSQL 18.6 (Debian)**, **pgvector 0.8.6**. The owner swapped the image from
  Alpine to Debian to install it.
- `KnowledgeChunk.embedding` is `Unsupported("vector(1536)")`.
- **1536, not 3072.** `text-embedding-3-large` is natively 3072 but **pgvector's HNSW caps at
  2000 dimensions**. OpenAI truncates natively via the `dimensions` parameter. Do not "fix" this
  to 3072 — the index will fail to build.
- Index: `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`.

### ⚠️ THE TRAP — read this

Prisma cannot express an HNSW index. Therefore:

- **`prisma migrate diff` will ALWAYS report `[-] Removed index on columns (embedding)`** against
  a correctly migrated database. That drift is expected and is **not** an error.
- **`prisma migrate dev` will generate a migration that DROPS the HNSW index. Never accept it.**
  Retrieval still returns *correct* results without the index, by sequential scan, so the
  regression is **silent** until the KB grows large enough to be slow.

This is documented on the `KnowledgeChunk` model in `schema.prisma` and in `backend/README.md`.

---

## 7. Knowledge Base backend (Phase 2 — DONE)

### Files

```
backend/src/modules/ai/knowledge/
  knowledge.controller.ts        # /api/v1/ai/knowledge-bases
  knowledge.service.ts
  knowledge.repository.ts        # THE ONLY place vector SQL lives
  dto/knowledge.dto.ts
  ingestion/extractors.ts        # pdf-parse v2, mammoth, text
  ingestion/chunker.ts
  ingestion/kb-ingest.processor.ts   # BullMQ worker
```

### Endpoints (all live)

`GET /ai/knowledge-bases`, `POST /ai/knowledge-bases`, `PATCH /:id`, `DELETE /:id`,
`GET /:id/sources`, `POST /:id/sources` (multipart file OR `{kind:'text',title,rawText}`),
`DELETE /sources/:sourceId`, `POST /sources/:sourceId/reindex`.
Permissions: `ai.knowledge.view` (reads), `ai.knowledge.manage` (writes).

### Security boundary — the most important part

`KnowledgeRepository.search()` hard-filters in SQL, all as **server-supplied parameters the model
cannot influence**:
```
c."organizationId" = $org                 -- tenant
c."knowledgeBaseId" = ANY($agentBases)    -- only bases bound to THIS agent
c.revision = s."activeRevision"           -- versioned
s."deletedAt" IS NULL
s.visibility = 'CUSTOMER_FACING'          -- INTERNAL can never reach a customer
```
Everything goes through `Prisma.sql`. Embedding length is asserted (1536) before the query runs.
The `kb_search` tool must accept **only a query string**; scope is injected from run context.

### Versioned re-index

Ingest into `revision = activeRevision + 1`; only once every chunk is written, flip
`activeRevision` and delete the old revision — **all in one transaction**. A failed re-index leaves
the previous revision serving. Unchanged `checksum` skips re-embedding (embeddings cost money).

### pdf-parse v2 gotcha

Not the v1 default-export function everyone remembers:
```ts
import { PDFParse } from 'pdf-parse';
const parser = new PDFParse({ data: new Uint8Array(buffer) });
const result = await parser.getText();   // result.text, result.total
await parser.destroy();
```
**It appends page markers like `-- 1 of 3 --`.** `extractors.ts` strips them; if you rewrite
extraction, keep doing so or they get embedded and quoted back at customers.

---

## 8. Frontend status — WHAT IS AND ISN'T BUILT

### ❌ Knowledge Base UI — **DOES NOT EXIST AT ALL**

Verified: no `src/features/knowledge*`, no `src/app/(workspace)/**/knowledge*` route, and
`grep -rn "knowledge" frontend/apps/web/src` returns **zero hits**. Phase 2 was explicitly
backend-only. **The owner has asked for this as part of Phase 5 so they can load real content and
test the agent.**

### ❌ AI Agent settings/admin UI — **DOES NOT EXIST**, and neither does its backend API

There is **no `AiAgent` CRUD controller/service** (`src/modules/ai/agent/` does not exist). The
only `AiAgent` reads in the codebase are inside `ai-resume.sweeper.ts`. So the settings UI needs a
backend API built first.

### ✅ Inbox AI UI — DONE (Phase 4b)

- `src/features/inbox/components/ai-control-panel.tsx` — state badge, pause reason, live countdown
  to `resumeAt`, "لن يُستأنف تلقائيًا" when none, pause/resume buttons gated on
  `usePermission("inbox.ai.control")`. Replaced the old `ai-placeholder-panel.tsx`.
- `message-bubble.tsx` — AI messages badged `الذكاء الاصطناعي` with a Sparkles icon;
  `delivery === "suppressed"` renders muted + struck-through with an explanation.
- `conversation-timeline.tsx` renders `ai.reply.sent`, `ai.reply.suppressed`, `ai.paused.human`,
  `ai.paused.manual`, `ai.resumed`.
- `use-inbox-management.ts` has `usePauseAi()` / `useResumeAi()`.
- Playwright: `playwright/journeys/inbox-ai-control.spec.ts` (replaced the obsolete placeholder
  journey).

### Frontend conventions you must follow

Feature folder shape: `{components,config,data,forms,hooks,schemas,screens,services,stores,types,
utils}` + an `index.ts` public API (pages import only from the feature index). Services are a
quartet: `x-service.ts` (interface) / `active-x-service.ts` / `http-x-service.ts` /
`mock-x-service.ts` + `x-mapper.ts` + `x-error.ts` + `x-query-keys.ts`.
**No i18n runtime — Arabic string literals inline. RTL is global (`dir="rtl"`).**
Reuse: `SettingsPage`, `EntityManager<T>`, `SchemaForm`, `DataTable`, `FileDropzone`,
`ConfirmDialog`/`DeleteDialog`, `StatusBadge`, `EmptyState`/`ErrorState`/`LoadingState`, `Timeline`.
Adding a settings page = 4 steps: nav child in
`src/features/organization-settings/config/navigation.ts` → permission keys in
`src/shared/config/permission-catalog.ts` (a contract test enforces this) → screen → 4-line page.
New nav icons must be registered in `src/shared/config/icon-registry.ts`.

---

## 9. Tests

### Passing (verified by me against real infrastructure)

| Suite | Command | Result |
|---|---|---|
| Backend unit | `npm test` | **187 passed / 45 suites** |
| ai-takeover (concurrency) | `npm run test:integration -- --testPathPatterns "ai-takeover"` | **10/10** |
| ai-control | `... "ai-control"` | **3/3** |
| knowledge (real pgvector) | `... "knowledge"` | **4/4** |
| Backend build | `npm run build` | clean |
| Frontend | `npm run lint && npm run typecheck && npm run test` | lint/typecheck clean, **247 passed** |

### Mutation-tested (proved the tests actually catch regressions)

- Disabling the fencing guard → **4 of 10** ai-takeover tests fail
- Ignoring the dispatch guard → **2 fail**
- Moving the webhook `turnSeq` increment outside its transaction → the boundary test fails
- Removing one env `: number` annotation → 2 env tests fail

### Known failures that are NOT yours

- **Frontend: 5 failures** in `tests/unit/auth/auth-service.test.ts` and
  `tests/unit/preferences/sidebar-store.test.ts` — Node 26 requires `--localstorage-file`.
  **Pre-existing**; confirmed identical on a stashed baseline. Do not try to fix as part of AI work.
- **Backend integration: ~46 of 113 fail** — pure drift, not regression. Every inbox spec calls
  `prisma.branch` (dropped table); `permission-catalog.spec.ts` asserts 81 permissions when the
  catalog has held 67→73. Verified this predates the branch (checked at `c4f1bf4`).
  **Deliberately not fixed** — deleting assertions to green a suite is how the drift started.
  Documented in `backend/README.md`.
- **Playwright: ~20 of 40 journeys** target deleted routes (`admissions`, `students`,
  `academic-catalog`, `program-batches`, `student-finance`). Same rot. Not addressed.

### Integration test setup (I built this — commit `0412875`)

`backend/test/jest-integration.json` + `npm run test:integration` (serial, shared DB).
Requires `backend/.env.test` (**gitignored**) pointing at a test database:
```bash
cp .env.test.example .env.test    # then set DATABASE_URL to the test DB
DATABASE_URL=<test> npx prisma migrate deploy
DATABASE_URL=<test> npx tsx prisma/seed.ts
```
A database `alsalam_test` already exists on the server, migrated and seeded.
`.env.test` currently exists locally — **if it goes missing, recreate it** (a delegated agent
deleted it once).

---

## 10. Environment variables

All optional; all default to AI **off**. Documented in `backend/.env.test.example`.

```
REDIS_URL=                                  # empty = queue stays disabled
OPENAI_API_KEY=                             # empty = OpenAiClient.isConfigured() false
OPENAI_CHAT_MODEL=gpt-4o                    # revisit before Phase 5 goes live
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_EMBEDDING_DIMENSIONS=1536            # do NOT raise above 2000 (HNSW limit)
OPENAI_REQUEST_TIMEOUT_MS=30000
OPENAI_MAX_RETRIES=2
AI_ENABLED=false
AI_QUEUE_ENABLED=false
AI_RESUME_SWEEP_ENABLED=true
AI_RESUME_SWEEP_MS=30000
```

> **⚠️ Every numeric env property in `env.validation.ts` MUST carry an explicit `: number`
> annotation** (e.g. `OPENAI_MAX_RETRIES: number = 2`). `emitDecoratorMetadata` derives
> `design:type` from the annotation alone; with none it emits `Object`, `enableImplicitConversion`
> never coerces, and the app refuses to boot the moment the variable is actually **set**. This bit
> us in production (commit `fc2733d`) and also affected the pre-existing `CAMPAIGN_TICK_MS`.
> `test/unit/config/env-validation.spec.ts` guards it.

---

## 11. Live/production database status

**Host:** `145.241.175.146:5432`, database `postgres`. Connection string in `backend/.env`
(gitignored). Superuser.

| Item | Status |
|---|---|
| `20260910120000_ai_agent_foundation` | **APPLIED** (8/8 tables; backfill verified 12 CUSTOMER / 12 HUMAN_AGENT, 0 NULLs) |
| `20260910130000_knowledge_chunks` | **NOT APPLIED — must be run manually** |
| pgvector | Available on server; **not yet `CREATE EXTENSION`-ed in the live DB** (the migration does it) |
| Seed | **NOT RUN.** Live has `AiAgent: 0`, `Permission: 67` (should be 73), no AI service account |

### Commands the human must run (a sandbox classifier blocks me from the live DB)

```bash
cd backend
npx prisma migrate deploy     # applies 20260910130000_knowledge_chunks
npx tsx prisma/seed.ts        # creates AI service account, ai-agent role, 6 AI permissions, default disabled agent
```
The seed is idempotent and rotates the AI service account's password hash each run (by design —
the account has no usable login).

---

## 12. Delegation workflow in use

Implementation is delegated to the **Codex CLI** via
`node /home/ubuntu/.claude/skills/codex-delegate/scripts/relay.mjs --brief <file> --cd /home/ubuntu/share/academy --timeout 2h`
(run in background). The orchestrator writes the brief, then **re-verifies and commits** — the relay
never commits.

**Hard-won lessons about Codex — put these in every brief:**
1. **Its sandbox has NO network.** It cannot `npm install`. Install dependencies yourself first
   and tell it they are already present.
2. **Its sandbox cannot reach PostgreSQL** (`EPERM`). It will honestly report integration tests as
   unverified. **You must run them yourself.**
3. **Verify its self-reported gates.** In Phase 1 it claimed tests passed when the deps had not
   installed; its retry test validated a fabricated error shape the SDK never produces.
4. It has twice deleted files it was not asked to (`.env.test`, `.env.test.example`). Check
   `git status` for unexpected `D` entries.
5. It does good work when told exact APIs and constraints. Give it real file paths and precedents.

---

## 13. Known risks / technical debt / do-not-touch

1. **`TicketTeam` has no CRUD API or UI.** One team is seeded; `TicketTeamMembership` has no FK to
   `Account`. Ticket routing rules (Phase 6) will point at teams admins cannot create. Flag to the
   owner — a small Teams admin surface is a real prerequisite for routing to be useful.
2. **`Ticket` has zero foreign keys** — `organizationId`, `teamId`, `employeeId`, `customerId`,
   `conversationId` are unvalidated UUIDs. Mitigated by going through `TicketService.create`.
3. **`InboxChannelConnection` is dead schema** — credentials come from env vars only
   (`ChannelCredentialsService`). Its doc comment claims encryption that does not exist.
4. **Single-tenant in practice.** `Organization.singletonKey` permits one row; every repo does
   `findFirstOrThrow`. `CallerContext` has no `organizationId`. Carry `organizationId` on new
   tables for future-proofing, but do not build a tenancy layer that does not exist elsewhere.
5. **SSE is contentless** — one `{type:'changed'}` ping; the frontend invalidates the whole
   `["inbox"]` react-query key. Fine, but do not expect per-event payloads.
6. **Meta channels reject outbound attachments** (`inbox.service.ts` ~line 431) for humans too, and
   **inbound provider media is never downloaded** (`storageKey` stays null). The agent must
   acknowledge non-text messages and hand off; it cannot read images or voice notes.
7. **`docker-compose.yml` still says `postgres:16`** but the real server is 18.6 Debian. Stale.
8. **`inbox.service.ts` `authorType` projection uses `.replace('_','-')`** — only replaces the
   first underscore. Fine for the current 3 enum values; would break on a 2-underscore value.

---

## 14. Phase 5 plan — where to start

The owner explicitly asked: **the Knowledge Base frontend must be usable before/as part of Phase 5**
so they can upload documents and test the agent end to end. Split accordingly.

### Phase 5a — make the KB usable from the UI (DO THIS FIRST)

**Backend (new, does not exist yet):**
- `src/modules/ai/agent/ai-agent.controller.ts` / `.service.ts` / `.repository.ts` / `dto/`
- `GET /api/v1/ai/agents` (list), `GET /:id`, `PATCH /:id` (guarded `ai.settings.view` /
  `ai.settings.manage` — already seeded), plus KB binding via `AiAgentKnowledgeBase`.
- Optimistic concurrency via `expectedVersion` (follow `TicketService.command` precedent).
- Document in `docs/api-data-requirements.html`.

**Frontend (new feature `src/features/ai-knowledge/`):**
- `/settings/ai/knowledge` — `KnowledgeBaseListScreen` using `EntityManager<KnowledgeBase>`.
- KB detail — sources `DataTable` with `StatusBadge` per source
  (`قيد الانتظار / قيد المعالجة / جاهز / فشل`), chunk count, size, reindex + delete row actions,
  failure banner showing `failureReason`.
- `AddSourceDialog` — two tabs: **رفع ملف** using the shared `FileDropzone` (accept pdf/docx/txt/md,
  20 MB) and **نص مباشر** using `TextareaField`.
- Poll with `refetchInterval: 3000` while any source is `PENDING`/`PROCESSING`.
- Minimal AI settings screen at `/settings/ai` — enable toggle, KB multi-select, channel toggles.
  That is enough to switch the agent on for testing; the full settings tabs are Phase 6.
- Wire nav + `permission-catalog.ts` + `icon-registry.ts` (see §8).

**Testing the flow needs:** `REDIS_URL` + `AI_QUEUE_ENABLED=true` + `OPENAI_API_KEY` set, otherwise
sources stay `PENDING` forever (the ingest worker never runs). Say this in the UI or the docs.

### Phase 5b — agent runtime (KB answering only, no write tools)

Create under `backend/src/modules/ai/runtime/`:
- `ai-eligibility.service.ts` — S1: lazy auto-resume if `resumeAt <= now`; agent enabled? channel
  enabled? working hours? `mode === AUTO`? conversation alive? **and the retryToken short-circuit**
  (if a committed message exists for this turn, skip generation and go straight to dispatch).
- `ai-context.service.ts` — S2: recent message window (token-budgeted), rolling summary, contact
  snapshot, open tickets, KB retrieval.
- `ai-orchestrator.service.ts` — S3: the OpenAI tool loop, max 4 iterations.
- `ai-turn.processor.ts` — BullMQ `@Processor(AI_TURN_QUEUE)` running S1→S5.
- `ai-turn.repository.ts`, `ai-summarizer.service.ts`
- `tools/tool.contract.ts` (`AgentTool`, `AiRunContext`, `ToolExecutor`), `tools/kb-search.tool.ts`,
  `tools/crm-read-contact.tool.ts` — **read-only tools only in this phase**
- `prompts/system-prompt.builder.ts`, `guards/prompt-injection.guard.ts`
- Enqueue: call from `MetaWebhookService.persist()` **after commit**, `jobId: ai:{conversationId}`,
  `delay: 4000` (debounce). **Mint the `AiTurn` row in Postgres first**, then add the job carrying
  `{conversationId, aiTurnId}` — the `AiTurn.id` is the retryToken source.
- On a failed fencing guard the worker must **re-enqueue itself once** (BullMQ silently no-ops
  `add()` for an existing jobId, so a message arriving while a job is active would otherwise be
  dropped rather than debounced).
- Anti-hallucination: relevance floor `settings.retrievalMinScore`; if retrieval is empty the reply
  must be the configured `fallbackMessage`, and `escalateOnFallback` triggers handoff.
- Wrap the enqueue so a **Redis outage degrades to "no AI", never to a failed webhook**.

**Tests for 5b:** scenarios 1, 2, 15, 18, 19, 20, 21 from §13 of the plan file. ai-takeover must
still be 10/10.

---

## 15. Remaining phases after 5

- **Phase 6** — write tools: `crm_update_contact` (allow-listed fields; **`phone` is NEVER
  writable** — it is the contact identity key `@@unique([organizationId, normalizedPhone])`),
  `crm_add_note`, `record_collected_fields`, `create_ticket`, `handoff_to_human`,
  `TicketRoutingService` (model picks a semantic category from a closed enum; a deterministic
  resolver maps it to a team; **below `routingMinConfidence` or with no rule the ticket is created
  UNASSIGNED and tagged `ai-routing-uncertain`; `employeeId` is NEVER set by the AI**). Per-turn
  and per-conversation write budgets. Full AI settings tabs.
- **Phase 7** — observability (`GET /ai/metrics`, `GET /ai/turns`), cost estimation, daily token
  ceiling, `AiTurn` retention pruning, outbound scrubbing, controlled rollout (one channel,
  `resumeAfterMinutes = null`, short working-hours window).

---

# NEXT AGENT START HERE

Do these in order.

1. **Orient.** Read `/home/ubuntu/.claude/plans/you-are-working-inside-toasty-journal.md` (the
   approved architecture) and §4 + §6 + §13 of this document (the traps). Confirm you are on
   `feat/ai-agent-foundation` and that `git status` shows only the pre-existing
   `D frontend/apps/web/.env.example`.

2. **Establish a green baseline before changing anything.** From `backend/`:
   ```bash
   npm test                                                        # expect 187 passed
   npm run build                                                   # expect clean
   npm run test:integration -- --testPathPatterns "ai-takeover"    # expect 10/10
   npm run test:integration -- --testPathPatterns "ai-control|knowledge"   # expect 7
   ```
   If `.env.test` is missing, recreate it (see §9). If ai-takeover is not 10/10, **stop and
   investigate** — something regressed the safety net.

3. **Ask the owner to run the two live commands in §11** (`prisma migrate deploy`, `prisma db seed`)
   if they have not. Phase 5a's UI will show an empty agent list until the seed runs.

4. **Build Phase 5a — the `AiAgent` CRUD API.** It does not exist and the settings UI depends on it.
   Start with `backend/src/modules/ai/agent/`. Follow `TicketService.command` for
   `expectedVersion` handling and update `docs/api-data-requirements.html` first
   (Constitution Principle III).

5. **Build Phase 5a — the KB frontend** (`src/features/ai-knowledge/`), per §14. This is what the
   owner explicitly asked for so they can upload documents and test. Reuse `EntityManager`,
   `FileDropzone`, `DataTable`, `StatusBadge`. Remember: ingestion only runs when
   `AI_QUEUE_ENABLED=true` with a reachable `REDIS_URL` and an `OPENAI_API_KEY`.

6. **Then Phase 5b — the agent runtime**, per §14.

**Before every commit:** re-run the four commands in step 2 yourself. Never trust a delegated
agent's self-reported gates (§12). Never weaken `ai-takeover.spec.ts`.
