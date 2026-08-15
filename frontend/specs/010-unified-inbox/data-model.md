# Data Model: Unified Inbox

## Modeling conventions

- IDs are opaque branded strings; relationships use IDs rather than embedded mutable copies.
- Dates are ISO-8601 instants in service data and localized only for presentation.
- Configurable lookups include a stable key, Arabic label, optional secondary-language label, active state, and display order.
- Commands carry the acting employee context inside the service boundary, never from editable form fields.
- Conversation projections expose only data permitted for the current session scope.
- `version` increments on mutable aggregate changes to detect stale edits and retries.

## Entities

### Customer

| Field | Type | Rules |
|---|---|---|
| id | CustomerId | Unique, immutable |
| displayName | string | Required, trimmed, 1–120 characters |
| avatarUrl | string or null | Optional; fallback initials required |
| phoneNumber | string | Required seeded contact value; normalized search form derived |
| platformIdentity | string | Required within the customer's platform context |
| branchId | BranchId or null | References a configurable branch when known |
| firstContactAt | instant | Must not be after lastActivityAt |
| lastActivityAt | instant | Updated from conversation activity |
| futureLinks | placeholder states | Student, admission, and finance references remain unavailable in this release |

### CommunicationPlatform

| Field | Type | Rules |
|---|---|---|
| id | PlatformId | Unique, immutable |
| key | string | Stable configurable key |
| label | localized label | Required Arabic label |
| iconKey | presentation key | Resolved by an allowlisted icon map |
| active | boolean | Inactive values remain displayable on historical conversations |

### Employee

| Field | Type | Rules |
|---|---|---|
| id | EmployeeId | Unique, immutable |
| displayName | string | Required |
| avatarUrl | string or null | Optional |
| teamIds | TeamId[] | At least the current operational team for team-scope personas |
| active | boolean | Inactive assignees remain visible historically but are not new assignment targets |

### Team and Branch

Both are configurable lookup entities with unique ID/key, localized label, active state, and display order. A team groups employees and can own conversations. A branch scopes customer context and filtering but does not replace permission scope.

### Tag

| Field | Type | Rules |
|---|---|---|
| id | TagId | Unique, immutable |
| key | string | Stable configurable key |
| label | localized label | Required and non-empty |
| colorToken | allowlisted token | Presentation token, never raw arbitrary style |
| active | boolean | Inactive tags remain on history but cannot be newly assigned |

### Conversation

Aggregate root for Inbox workflow.

| Field | Type | Rules |
|---|---|---|
| id | ConversationId | Unique, immutable |
| customerId | CustomerId | Required |
| platformId | PlatformId | Exactly one platform |
| status | ConversationStatus | `open`, `pending`, `snoozed`, `closed`, or `archived` |
| assignedEmployeeId | EmployeeId or null | Optional; may coexist with team assignment |
| assignedTeamId | TeamId or null | Optional; may coexist with employee assignment |
| tagIds | TagId[] | Unique values; zero or more |
| unreadCount | non-negative integer | Reset/updated through explicit read/message behavior |
| lastMessageId | MessageId or null | Must belong to this conversation |
| lastActivityAt | instant | Drives default ordering |
| deletedAt | instant or null | Soft-deleted mock state; excluded from ordinary reads |
| version | positive integer | Increments on mutable command success |

**Derived projections**: list item, full detail, customer context, dashboard summary, saved-view count, searchable document, and future AI context.

### Message

| Field | Type | Rules |
|---|---|---|
| id | MessageId | Unique, immutable |
| conversationId | ConversationId | Required parent |
| direction | `incoming` or `outgoing` | System events and notes use separate entities |
| sender | Customer or employee reference | Must match direction |
| body | string | Trimmed; may be empty only when at least one attachment exists |
| attachmentIds | AttachmentId[] | Zero or more supported attachments |
| sentAt | instant | Immutable |
| deliveryStatus | DeliveryStatus | Outgoing: sending/sent/delivered/read/failed; incoming may use received |

### Attachment

| Field | Type | Rules |
|---|---|---|
| id | AttachmentId | Unique, immutable |
| kind | `image`, `pdf`, `document`, `voice`, or `video` | Allowlisted |
| fileName | string | Required, safe display name |
| mediaType | string | Must match supported mock rules |
| sizeBytes | non-negative integer | Must not exceed configured mock limit for new sends |
| previewUrl | string or null | Fixture/object URL only; revoked when no longer used |
| durationSeconds | number or null | Voice/video placeholder metadata |
| availability | `available` or `placeholder` | Voice/video may intentionally be placeholders |

### InternalNote

| Field | Type | Rules |
|---|---|---|
| id | NoteId | Unique, immutable |
| conversationId | ConversationId | Required parent |
| authorEmployeeId | EmployeeId | Required; controls edit/delete ownership |
| content | string | Trimmed, 1–4,000 characters |
| createdAt | instant | Immutable |
| updatedAt | instant or null | Set after edit |
| deletedAt | instant or null | Soft deletion removes it from ordinary display |
| version | positive integer | Used for stale edit protection |

### AssignmentHistoryEvent

| Field | Type | Rules |
|---|---|---|
| id | AssignmentEventId | Unique, immutable |
| conversationId | ConversationId | Required parent |
| previous | AssignmentSnapshot | Employee/team IDs before change; either may be null |
| next | AssignmentSnapshot | Employee/team IDs after change; either may be null |
| performedByEmployeeId | EmployeeId | Required actor |
| occurredAt | instant | Immutable |

No update or delete command exists for this entity.

### SystemEvent

Immutable conversation timeline record for status, archive, delete/restore, and other operational changes. Contains ID, conversation ID, event type, localized-safe structured details, actor, and occurrence time.

### InboxPermissionProfile

| Field | Type | Rules |
|---|---|---|
| employeeId | EmployeeId | Current mock user |
| tenantId | TenantId | Required future isolation boundary |
| visibility grants | permission keys | May contain all, team, assigned, or none |
| action grants | permission keys | Independent granular grants |

Effective scope precedence: `inbox.view.all` → `inbox.view.team` → `inbox.view.assigned` → forbidden.

### SavedView

Predefined configuration with key, localized label, required visibility scope, and a deterministic predicate/query patch. Initial keys: all, assigned-to-me, my-team, unassigned, closed, archived.

### InboxListQuery

| Field | Type | Rules |
|---|---|---|
| search | string | Trimmed, normalized; matches customer name, phone, message content, tag |
| savedView | SavedViewKey | One predefined view |
| platforms/statuses/employeeIds/teamIds/branchIds/tagIds | ID arrays | Deduplicated; active and historical lookup IDs accepted for filtering |
| unreadOnly | boolean | Defaults false |
| activityFrom/activityTo | date or null | From must not exceed to |
| sort | sort key and direction | Default last activity descending; stable ID tie-breaker |
| cursor | opaque string or null | Service-produced only |
| limit | integer | Bounded default and maximum |

### InboxWorkspaceState

Client-only UI state: selected conversation ID, current list query excluding service cursor, active responsive pane, open detail panel, per-conversation text draft/attachment metadata, and user-dismissed placeholder state. It contains no conversation entities, messages, notes, assignments, or permission truth.

## Relationships

```text
Customer 1 ── * Conversation * ── 1 CommunicationPlatform
Conversation 0..1 ── 1 Employee (assigned)
Conversation 0..1 ── 1 Team (assigned)
Conversation * ── * Tag
Conversation 1 ── * Message 1 ── * Attachment
Conversation 1 ── * InternalNote * ── 1 Employee (author)
Conversation 1 ── * AssignmentHistoryEvent * ── 1 Employee (actor)
Conversation 1 ── * SystemEvent
Employee * ── * Team
Customer * ── 0..1 Branch
```

## Conversation state transitions

| From | To | Required permission | Notes |
|---|---|---|---|
| open | pending, snoozed, closed | `inbox.change.status` | Immediate mock transition |
| pending | open, snoozed, closed | `inbox.change.status` | Immediate mock transition |
| snoozed | open, pending, closed | `inbox.change.status` | No scheduled wake-up in this release |
| closed | open, pending, snoozed | `inbox.change.status` | Remains searchable |
| any non-archived | archived | `inbox.archive` | Remains searchable/readable by authorized users |
| archived | open, pending, snoozed, closed | `inbox.restore` | Explicit restore command; target status supplied and validated |
| any visible | deleted | `inbox.delete` | Soft-delete after confirmation; excluded from normal results |
| deleted | prior status | `inbox.restore` | Restores previous status/assignment snapshot where applicable |

Every successful transition increments conversation version, updates activity, appends a system event, and reconciles list/detail/summary/view projections.

## Assignment transitions

Assignment is a pair `(employeeId|null, teamId|null)`. At least one target may be present, or both may be null for unassignment. Initial assignment requires the matching employee/team assignment permission. Any change to an already populated pair additionally requires `inbox.reassign`. Each successful change appends exactly one immutable assignment history event.

## Derived data invariants

- Dashboard and saved-view counts are computed after visibility scope, never from the global fixture set.
- The list last-message preview points to the latest customer-visible message, while system/note activity may still update `lastActivityAt` according to the command contract.
- Closed and archived items remain searchable; deleted items require the administrative restore surface and are never returned to ordinary searches.
- Note content is never included in customer-visible message projections.
- Disabled AI context is read-only and excludes commands, hidden conversations, and data outside tenant/visibility scope.
