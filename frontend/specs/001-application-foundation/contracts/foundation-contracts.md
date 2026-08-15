# Foundation Contracts

These contracts define internal frontend interfaces. They are not HTTP or database contracts.

## Feature Public Boundary

Each feature exposes only its public components, hooks, types, schemas, services, and optional
navigation contribution through a single public entry point. Code outside the feature MUST NOT
import its `data` directory or internal adapter implementation.

```text
page -> feature public API -> query/mutation hook -> service contract -> selected adapter
                                                        |
                                                        +-> mock data (foundation phase)
```

Replacing the mock adapter with a live adapter MUST preserve the service contract and page API.

## Authentication Service

### Operations

- `signIn(credentials)` returns a Promise of authenticated Employee Context or rejects with a
  typed Service Error.
- `getSession()` returns a Promise of authenticated Employee Context or anonymous state.
- `signOut()` returns a Promise confirming local session removal.

### Behavioral Guarantees

- Credentials are validated by the auth schema before service invocation.
- Mock credentials and password values are never persisted.
- Pending, success, invalid-credential, and unexpected-failure outcomes are deterministic in
  validation mode.
- Corrupt or unsupported persisted session state resolves safely to anonymous.

## Navigation Registry

### Contribution

A feature may contribute a readonly list of Navigation Items. The registry validates unique IDs,
unique leaf routes, valid icon keys, and leaf-route presence.

### Permission Evaluator

The evaluator accepts a Permission Key and the current mock permission set and returns visible or
hidden. It is a visibility contract only; it MUST NOT be described or reused as live authorization.

### Derived Navigation

The shell receives the recursively filtered tree. It derives active state, page title, and
breadcrumb from the current pathname. Empty groups are removed. Pages do not filter navigation.

## State Ownership Contract

| State | Authority | Persistence |
|---|---|---|
| Async session/service data | TanStack Query | Through service adapter where required |
| Employee/role/branch shared context | Focused Zustand store | Versioned browser storage |
| Desktop sidebar preference | Focused Zustand store | Versioned browser storage |
| Tablet navigation overlay | Local component state | None |
| Appearance | next-themes | Library-managed browser storage |
| Current route/active navigation | App Router pathname | None |
| Dialog, draft filter, menu expansion | Local component state | None |

No state may have two writable authorities.

## Provider Contract

The provider composer supplies Query, appearance, notifications, and persisted-state hydration to
interactive descendants. It is a narrow Client Component rendered beneath the server root layout.
Providers MUST NOT cause the document element or entire route tree to become client-owned.

## Shared Layout Contracts

- `AppShell` accepts server-renderable content and navigation/user-menu slots.
- `PageContainer` provides the single content width and spacing convention.
- `PageHeader` accepts title, optional description, breadcrumb, and action slots.
- `Section` groups related content with an accessible heading relationship.
- `Sidebar` accepts filtered Navigation Items and controlled expanded/overlay state.
- `Header` exposes identified search and notification placeholders plus the employee menu.

Layout components render structure and interactions only; they do not fetch data or decide
business permissions.

## Shared State and Feedback Contracts

- `LoadingState` communicates progress with an accessible label.
- `EmptyState` communicates absence and may expose one recovery/creation action.
- `ErrorState` accepts a safe message, retryability, and optional recovery action.
- `StatusBadge` maps a supplied semantic status to the shared visual vocabulary; it does not
  define feature statuses.
- `ConfirmDialog` and `DeleteDialog` require explicit title, consequence, confirm label, cancel
  label, pending state, and focus return.
- Successful and failed actions use the shared Sonner feedback adapter; native alerts are invalid.

## Form Contracts

- `FormWrapper` accepts a feature-owned form instance, submit handler, pending state, and feedback
  region.
- Field adapters accept control metadata and render accessible labels, descriptions, and errors.
- Text, textarea, select, combobox, date, phone, currency, switch, file-selection, and rich-text
  adapters MUST NOT own business validation.
- The first invalid control receives focus after failed submission.
- Arabic errors and disabled/pending states are announced accessibly.
- Rich-text behavior, if delivered, uses Tiptap; file selection uses react-dropzone.

## Data Table Contract

The generic table accepts typed rows and feature-owned column definitions. It supports controlled
search, filters, sorting, pagination, row selection, bulk actions, and column visibility, plus
loading, empty, and error presentations.

The table MUST NOT fetch data, define business columns, or infer permissions. Controlled callbacks
and query parameters allow a future feature to switch from local mock operations to server-driven
operations without replacing the table UI.

Rows require stable IDs. Selection resets or reconciles when filtering removes selected rows.
Pagination clamps to a valid page when result count changes. Bulk actions receive selected row
identities and explicit enabled/pending states.

## File Selection Contract

The shared file-selection area accepts constraints and emits accepted files plus structured
rejections. It supports drag/drop and keyboard-accessible native selection, exposes rejected type
or size reasons, and allows removal/retry. It performs no upload transport or remote storage.

## Route-State Contract

Workspace segments provide shared `loading`, `error`, and `not-found` presentations where
applicable. Every page supplies a unique Arabic title and visible primary heading so route changes
are announced meaningfully. Expected form/service failures remain local and recoverable; unexpected
render failures go to the nearest route error boundary.

## RTL and Responsive Contract

- The document root is `lang="ar"` and `dir="rtl"`.
- Layout uses logical properties; mixed-direction email/numeric content is isolated.
- Directional icons mirror only when their meaning changes with direction.
- Desktop and laptop use persistent expanded/collapsed navigation.
- Tablet uses a dismissible overlay/drawer with focus containment and return.
- At 200-percent zoom and every target viewport, required actions remain reachable without
  horizontal page overflow.

## Registration Contract for Future Modules

A future module becomes shell-visible by adding its isolated feature directory, route segment,
public navigation contribution, permission keys, and service adapter. It MUST NOT modify an
existing feature's internal files. Changes to the central registry are additive composition,
not edits to module behavior.
