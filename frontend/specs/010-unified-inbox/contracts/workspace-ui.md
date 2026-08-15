# Contract: Inbox Workspace UI

## State ownership

| State | Owner |
|---|---|
| Conversation/message/note/assignment/tag data and summaries | Inbox service + TanStack Query cache |
| Selected conversation, list query, saved view, pane, side panel, draft metadata | Feature Zustand workspace store |
| Dialog target, menu open state, hover, temporary preview | Local component state |
| Form values/errors/submission | React Hook Form where applicable, validated by shared Zod command schemas |

The Zustand store must never contain copied conversation entities or permission truth.

## Pane behavior

### Desktop

- Saved views/widgets, conversation list, and conversation workspace are simultaneously available.
- Customer details, internal notes, timeline, assignment history, and AI placeholders use a bounded detail rail, tabs, or overlay without shrinking chat below its usable minimum.
- Selecting a list item updates the workspace without losing current list query or scroll position.

### Laptop

- Saved-view navigation may collapse.
- List and workspace remain primary; customer/collaboration details open as a dismissible overlay or collapsible rail.

### Tablet

- Conversation list and workspace are separate navigable panes.
- Opening a conversation moves focus to its heading; Back returns focus to the originating list item.
- Customer/collaboration content opens in an accessible sheet/dialog.

### Mobile

- Single-pane order: saved views/list → workspace → detail panel.
- Essential search/filter, read, and permitted reply actions remain available.
- Draft and list state survive pane transitions during the active session.

## Conversation list interaction

- The list is a named navigation region with semantic list items and one clear selected state.
- Tab reaches the list; managed arrow navigation may move between loaded items; Enter/Space opens the focused conversation.
- Loading the next cursor page never moves focus or announces every inserted item; a concise result/load status is announced.
- Unread state uses text/count and semantics, never color alone.
- Search and combined filters expose labels, active-filter count, removable chips, clear-all, validation, and no-results recovery.

## Workspace interaction

- The message history has a stable accessible name and chronological reading order even when older pages are prepended.
- Message bodies use automatic direction isolation; chrome remains Arabic RTL.
- New outgoing messages and incoming scenario messages are announced politely without stealing focus.
- Composer supports text, emoji trigger, attachment staging/removal, send, pending, and validation. Enter-to-send must preserve a discoverable multiline method; keyboard behavior is documented in helper text.
- Internal notes are visually and semantically labeled employee-only and cannot be confused with outgoing messages.
- Destructive operations use confirmation dialogs and restore focus to their invoker.

## Loading and failure isolation

- Route loading covers initial navigation only.
- List, workspace, message history, customer data, notes, and history may fail or load independently.
- Losing the selected conversation because of scope/filter/mutation selects no hidden replacement silently; the UI explains the transition and chooses the next item only when the employee explicitly opts into that behavior.
- Expected command failures remain in context, preserve safe form input, and produce actionable feedback.

## AI placeholders

Each AI area has a title, short future-purpose description, and explicit unavailable/coming-later state. It cannot receive submit focus or expose an enabled action. Placeholder content never resembles generated customer data.
