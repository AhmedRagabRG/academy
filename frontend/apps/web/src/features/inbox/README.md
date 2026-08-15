# Inbox module

The Inbox owns its route screen, conversational components, typed domain, Zod schemas,
TanStack Query hooks, Zustand workspace coordination, fixtures, and service boundary.

Domain records never live in the Zustand store and fixtures are imported only by the mock
service. The route page is a thin server entry; `InboxScreen` is the interactive client
boundary. Shared buttons, badges, inputs, feedback states, fixture notice, stat cards, and
timeline are reused. Conversation cards and message bubbles stay feature-local because they
are semantic navigation/chat surfaces rather than general data tables.

The active adapter is deliberately mock-only. A future remote adapter implements
`InboxService` without changing screens. Authorization must remain authoritative in that
adapter even though the current UI also hides unavailable actions.
