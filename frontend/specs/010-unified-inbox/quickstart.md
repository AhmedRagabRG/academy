# Quickstart Validation: Unified Inbox

## Prerequisites

- Node.js 20 or newer and npm 10.9.x.
- Dependencies installed from the repository root.
- Inbox implementation completed from this plan and subsequent `tasks.md`.
- Mock services enabled; no backend or messaging-provider credentials are required.

## Start the application

From the repository root:

```bash
npm install
NEXT_PUBLIC_API_MOCKS=true npm run dev -w web
```

Open `http://localhost:3000/inbox`. Confirm the Arabic RTL shell displays the fixture-data notice and no network integration is implied.

## Static and automated validation

```bash
npm run typecheck -w web
npm run lint -w web
npm run test -w web
npm run build -w web
npm run test:e2e -w web -- --project=desktop
npm run test:e2e -w web -- --project=laptop
npm run test:e2e -w web -- --project=tablet
```

Run focused tests during implementation:

```bash
npm run test -w web -- tests/unit/inbox tests/integration/inbox tests/contract/inbox
npm run test:e2e -w web -- playwright/journeys/inbox-management.spec.ts
npm run test:e2e -w web -- playwright/journeys/inbox-permissions.spec.ts
npm run test:e2e -w web -- playwright/journeys/inbox-responsive.spec.ts
npm run test:e2e -w web -- playwright/accessibility/inbox-a11y.spec.ts
npm run test:e2e -w web -- playwright/accessibility/inbox-keyboard.spec.ts
```

Expected outcome: commands exit successfully; unrelated pre-existing repository failures, if any, are recorded separately and are not silently attributed to Inbox.

## Seeded persona validation

Use the mock scenario/persona selector available to tests and development fixtures.

| Persona | Expected result |
|---|---|
| Assigned employee | Only direct assignments; can reply and manage own notes |
| Team lead | Team assignments; can assign/reassign, change status, tag, note, and reply |
| Global administrator | All tenant conversations and administrative delete/restore actions |
| Read-only auditor | All visible data; no mutation controls |
| No-access employee | Forbidden Inbox state and zero conversation data/counts |

For each persona, attempt a forbidden command through service integration tests as well as inspecting UI controls. Expected result: typed permission failure and no state change.

## End-to-end scenarios

### 1. Discover and open a conversation

1. Start as Team lead.
2. Verify dashboard counts match the visible team-scope fixture set.
3. Select My Team, search using Arabic customer text, and combine platform, status, tag, branch, and unread filters.
4. Sort and progressively load another page.
5. Open a known result.

Expected: no out-of-scope results or counts; no duplicate rows; list query and scroll state remain when returning from the workspace.

### 2. Reply and attachments

1. Open a long conversation containing text, image, PDF/document, voice placeholder, video placeholder, and system events.
2. Load older messages and confirm scroll position is preserved.
3. Send mixed Arabic/Latin text and an emoji.
4. Stage, remove, and then send a supported attachment.
5. Try an unsupported/oversize attachment through its fixture scenario.

Expected: outgoing message appears once with delivery state, list preview/activity update, mixed text direction is readable, and invalid attachment produces clear feedback without losing the draft.

### 3. Assignment, status, and tags

1. Assign both a team and employee to an unassigned conversation.
2. Reassign one target, then remove it.
3. Inspect assignment history.
4. Change Open → Pending → Closed, add two tags, and remove one.
5. Archive and restore as an authorized persona.

Expected: every affected surface and count reconciles within one second; each assignment change appends exactly one immutable event; history has no edit/delete action.

### 4. Internal note privacy and ownership

1. Add a note as Employee A.
2. View it as Employee B with conversation visibility.
3. Attempt edit/delete as Employee B, then as Employee A.

Expected: both can read the clearly private note; only Employee A can edit/delete; note content never appears in customer-visible message projections.

### 5. Permission and scope change

1. Open a globally visible conversation as Global administrator.
2. Switch the mock profile to Assigned employee where that conversation is out of scope.

Expected: scoped queries are replaced, protected content disappears immediately, open protected panels close safely, focus lands on a useful Inbox state, and no previous global data remains in visible results.

### 6. Responsive and keyboard workflow

At desktop, laptop, tablet, and a representative mobile viewport:

1. Navigate saved views, search/filters, list, workspace, composer, and detail panels using keyboard only.
2. Open/close dialogs and responsive panes.
3. Verify focus entry and restoration, no horizontal page scrolling at normal size or 200% zoom, visible focus, 44-pixel minimum touch targets, accessible names, and meaningful screen-reader announcements.
4. Run the axe-based Inbox accessibility journey.

Expected: primary workflows complete at all mandatory viewports, essential list/read/reply completes on mobile, and no critical accessibility violations remain.

### 7. Empty, error, and conflict states

Use mock scenario controls to produce empty results, initial load failure, messages-only failure, mutation failure, stale version conflict, missing avatar, and deleted selected conversation.

Expected: failures are isolated to the affected surface, retry is available where useful, safe input is preserved, no silent failure occurs, and the workspace never exposes stale hidden content.

### 8. AI boundaries

Inspect summary, reply, assignment, tag, sentiment, and knowledge-search placeholders using pointer, keyboard, and assistive technology.

Expected: all are explicitly unavailable, expose no enabled command, perform no network/model work, and never mutate conversation data.

## Contract references

- Domain entities and transitions: [data-model.md](./data-model.md)
- Reads, commands, errors, and cache consistency: [contracts/inbox-service.md](./contracts/inbox-service.md)
- Visibility and granular actions: [contracts/permissions.md](./contracts/permissions.md)
- Responsive panes, focus, and state ownership: [contracts/workspace-ui.md](./contracts/workspace-ui.md)
