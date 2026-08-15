# Ticket Management Contracts

**Feature**: 011-ticket-management | **Date**: 2026-08-09

## Service Boundary

All methods are asynchronous and return cloned domain projections. Reads accept an optional abort signal. Commands carry acting context and `expectedVersion` where an existing ticket changes.

```ts
interface TicketService {
  getConfiguration(signal?: AbortSignal): Promise<TicketConfiguration>
  listTickets(query: TicketListQuery, signal?: AbortSignal): Promise<CursorPage<TicketSummary>>
  getTicket(ticketId: TicketId, signal?: AbortSignal): Promise<TicketDetail>
  getDashboard(query: DashboardQuery, signal?: AbortSignal): Promise<TicketDashboard>
  listActivity(ticketId: TicketId, signal?: AbortSignal): Promise<TicketActivity[]>
  listComments(ticketId: TicketId, signal?: AbortSignal): Promise<TicketComment[]>

  createTicket(command: CreateTicketCommand): Promise<TicketDetail>
  updateTicket(command: UpdateTicketCommand): Promise<TicketDetail>
  changeStatus(command: ChangeStatusCommand): Promise<TicketDetail>
  changePriority(command: ChangePriorityCommand): Promise<TicketDetail>
  changeAssignment(command: ChangeAssignmentCommand): Promise<TicketDetail>
  addComment(command: AddCommentCommand): Promise<TicketComment>
  editComment(command: EditCommentCommand): Promise<TicketComment>
  deleteComment(command: DeleteCommentCommand): Promise<void>
  uploadAttachment(command: UploadAttachmentCommand): Promise<TicketAttachment>
  archiveTicket(command: ArchiveTicketCommand): Promise<TicketDetail>
  restoreTicket(command: RestoreTicketCommand): Promise<TicketDetail>
  deleteTicket(command: DeleteTicketCommand): Promise<void>
}
```

The future HTTP adapter implements this interface. Pages and components never distinguish mock from HTTP mode.

## Read Contracts

### `TicketListQuery`

- Includes active/archived mode, zero or more filter values for each supported dimension, normalized search, stable sort, cursor, and page size.
- Service injects actor scope from current context; callers cannot request a broader scope.
- Search covers number, title, description, customer, student, and tags.
- Results contain only display-safe summaries and derived capabilities.
- `nextCursor` is opaque; changing any non-cursor field invalidates it.

### `TicketDetail`

Contains full ticket fields, resolved related summaries, current assignment, attachments, comment count, AI placeholder descriptors, and derived capabilities. Comments and activity may be separate queries for independent states. Direct access outside scope yields `forbidden` or `not-found` according to the app's non-disclosure policy.

### `TicketDashboard`

Returns open, mine, team, waiting, critical, and completed-today values calculated from the same permission-scoped snapshot used by list reads. It includes `asOf` and scope fingerprint so stale cross-persona data cannot be reused.

## Command Envelope

Commands include `actor`, command-specific input, and—except create—`ticketId` plus `expectedVersion`. The service evaluates permission and scope before returning version or validation detail. Successful commands increment the aggregate version once and append exactly one primary activity record; comment/attachment commands also update derived counts.

### Command permissions

| Command | Required key | Additional rule |
|---|---|---|
| createTicket | `tickets.create` | Required fields valid |
| updateTicket | `tickets.edit` | Ticket in actor scope |
| changeStatus | `tickets.change.status` | Active target status; archive excluded |
| changePriority | `tickets.change.priority` | Active configured priority |
| changeAssignment (team) | `tickets.assign.team` | Team active/in organization |
| changeAssignment (employee) | `tickets.assign.employee` | Employee active; team membership valid when both |
| reassign existing ownership | `tickets.reassign` plus relevant assign keys | Assignment actually changes |
| add/edit/delete comment | `tickets.comment` | Edit/delete only own comment |
| uploadAttachment | `tickets.attach.files` | Supported type/size |
| archiveTicket | `tickets.archive` | Active ticket |
| restoreTicket | `tickets.restore` | Archived ticket |
| deleteTicket | `tickets.delete` | Explicit confirmation token |

## Error Contract

`TicketServiceError` exposes a stable code, safe Arabic-facing message key, optional field errors, and retryability. Codes include `forbidden`, `not-found`, `validation`, `version-conflict`, `invalid-transition`, `assignment-mismatch`, `unsupported-attachment`, `cursor-invalid`, and `mock-failure`. UI maps codes centrally, restores optimistic snapshots when needed, and never displays raw exceptions.

## Query Key Contract

Keys always contain organization/scope fingerprint and normalized query:

- `tickets.configuration(scope)`
- `tickets.list(scope, queryWithoutCursor)` with infinite pages
- `tickets.detail(scope, ticketId)`
- `tickets.comments(scope, ticketId)`
- `tickets.activity(scope, ticketId)`
- `tickets.dashboard(scope, normalizedDashboardQuery)`

Mutation hooks update exact cached summaries when safe, then invalidate affected status lists, detail, dashboard, comments/activity, and archived families.

## Board Interaction Contract

- Ticket ID is the stable draggable identity and workflow status is the droppable identity.
- Drop, keyboard move, touch menu, and direct menu all submit the same `changeStatus` command.
- The drag handle is semantic/focusable, disabled without capability, and separate from card navigation/actions.
- Arabic screen-reader instructions identify pickup, available movement, destination, drop, and cancellation.
- An assertive/polite live region announces successful destination or rollback; focus returns to the moved card or its status action.
- Mobile exposes the direct move action even when cross-column drag is absent.

## Infinite Column Contract

Each active status owns its query lifecycle. A bottom sentinel requests the next cursor only when one exists and no request is pending. A visible “load more” control offers equivalent manual operation. Pages deduplicate by ticket ID. Moving a ticket removes it from the source cache, inserts it in the destination cache according to stable sort, adjusts counts, and reconciles after success.

## Related Module Ports

Ticket Management defines narrow read-only ports for organizational lookups and related conversation/student/customer summaries. Adapters import other modules only through their public barrels. Missing or forbidden related data renders an unavailable reference without hiding the ticket itself.

## UI State Contract

Every screen/surface must represent loading, loaded, empty, filtered-empty, retryable error, forbidden, and unavailable states. Commands expose idle/pending/success/failure; repeated submission is blocked while pending. Sonner communicates command outcomes, while inline field and surface errors remain near their source.

## AI Placeholder Contract

Placeholders have stable type (`summary`, `assignee`, `priority`, `similar`, `resolution`), Arabic label, disabled state, and future-capability description. They expose no actionable control, make no service request, and never fabricate suggestion content.
