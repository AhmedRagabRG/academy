# Contract: Inbox Service

## Purpose

`InboxService` is the only feature data boundary used by Inbox hooks and screens. The initial adapter is in-memory and deterministic. A future remote adapter must preserve these semantics.

## Read operations

| Operation | Input | Output | Required access |
|---|---|---|---|
| listConversations | `InboxListQuery` | `CursorPage<ConversationListItem>` | Any Inbox visibility grant; results scoped first |
| getConversation | conversation ID | `ConversationDetail` | Conversation must be in effective scope |
| listMessages | conversation ID, before cursor, limit | `CursorPage<MessageTimelineItem>` | Conversation visibility |
| listNotes | conversation ID | `InternalNote[]` plus ownership capabilities | Conversation visibility |
| listAssignmentHistory | conversation ID, cursor | `CursorPage<AssignmentHistoryEvent>` | Conversation visibility |
| getLookups | none | platforms, statuses, tags, branches, teams, employees | Any Inbox visibility grant; assignment targets filtered to active values |
| getDashboard | active query/view context | `InboxDashboardSummary` | Counts computed after visibility |
| getPermissionContext | none | effective scope and action grants | Authenticated mock session |
| getAiContext | conversation ID | read-only disabled placeholder projection | Conversation visibility; no AI execution |

All reads accept cancellation signals. Cursor values are opaque. Pages have stable ordering and never repeat IDs for an unchanged query snapshot.

## Command operations

| Command | Required permission/rule | Result |
|---|---|---|
| sendReply | `inbox.reply`; non-empty body or attachment; visible conversation | Created outgoing message and updated conversation projection |
| changeStatus | `inbox.change.status`; valid non-archive transition | Updated conversation and system event |
| archiveConversation | `inbox.archive` | Archived conversation and system event |
| restoreConversation | `inbox.restore` | Restored conversation and system event |
| deleteConversation | `inbox.delete` | Soft-deleted result and system event |
| changeAssignment | matching employee/team grant; `inbox.reassign` when replacing/removing existing assignment | Updated conversation plus immutable history event |
| addTags/removeTag | `inbox.manage.tags`; active tag for new addition | Updated conversation |
| addNote | `inbox.manage.notes`; valid content | Created private note |
| editNote/deleteNote | `inbox.manage.notes`; current employee owns note | Updated/deleted private note |
| markRead | visible conversation | Updated unread count; no reply permission needed |

Commands receive expected versions where stale edits could overwrite data. A retry token is used for sends and destructive/assignment commands so an identical retry cannot create duplicate messages or history events.

## Error contract

Expected errors are typed values/classes mapped by hooks into inline states or Sonner feedback:

- `FORBIDDEN_SCOPE`: conversation or aggregate is outside effective visibility.
- `FORBIDDEN_ACTION`: actor lacks a required action permission.
- `NOT_FOUND`: entity does not exist or is intentionally indistinguishable from inaccessible data.
- `VALIDATION`: command/query violates the authoritative schema; includes safe field issues.
- `CONFLICT`: expected version is stale; caller refetches and explains the change.
- `UNSUPPORTED_ATTACHMENT`: file kind, size, or metadata is not accepted by the mock policy.
- `SCENARIO_FAILURE`: deterministic test scenario injected an expected failure.

Errors must not include fixture internals, hidden entity names, or stack traces in user-facing output.

## Consistency contract

1. The service clones fixture seeds when a mock session starts and exposes an explicit reset for tests/scenarios.
2. A command validates session, scope, permission, entity state, ownership, schema, and expected version before mutation.
3. A successful command applies atomically and returns its authoritative result.
4. Mutation hooks reconcile every affected query family: detail, lists, messages/notes/history, dashboard, and saved-view counts.
5. A failed command changes no domain state.
6. Assignment history and system events are append-only.
7. Notes never enter customer-visible message output.

## Query-key families

Keys include tenant/session scope fingerprint so cached data cannot cross mock personas:

```text
inbox/all(scopeFingerprint)
inbox/lists(scopeFingerprint)
inbox/list(scopeFingerprint, normalizedQuery)
inbox/detail(scopeFingerprint, conversationId)
inbox/messages(scopeFingerprint, conversationId)
inbox/notes(scopeFingerprint, conversationId)
inbox/assignmentHistory(scopeFingerprint, conversationId)
inbox/lookups(scopeFingerprint)
inbox/dashboard(scopeFingerprint, normalizedQuery)
inbox/permissions(scopeFingerprint)
```

## Future adapter boundary

No HTTP adapter or endpoint is implemented in this feature. Future adapters may serialize the same queries and commands, but must enforce authorization remotely, preserve opaque cursors and typed errors, and return projections with the same privacy guarantees. UI code must not branch on mock versus remote transport.
