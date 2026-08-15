<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0
- Modified principles:
  - I. Simplicity First -> I. Business First
  - II. UI Before Backend -> II. Modular Architecture
  - III. Arabic-First Experience -> III. Dynamic Configuration
  - IV. Consistent Design System -> IV. Reusable Components
  - V. Permission-Aware Design -> V. Frontend Separation
  - VI. Modular Architecture -> VI. Accessibility
  - VII. Reusable Components -> VII. RTL Native
  - VIII. Performance by Default -> VIII. Responsive by Default
  - IX. Accessibility & UX -> IX. Consistency Over Creativity
  - X. Code Quality -> X. AI Ready
- Added sections: Technical Principles; Future Compatibility; Decision Rule
- Removed sections: Technology Stack; Development Workflow
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
- Runtime guidance reviewed:
  - ✅ AGENTS.md
  - ✅ README.md
- Command guidance reviewed: ✅ .agents/skills/speckit-*/SKILL.md
- Follow-up TODOs: none
-->
# Alsalam AI Operations Platform Constitution

## Core Principles

### I. Business First
Every implementation MUST prioritize real educational-institution workflows over technical
convenience. Specifications and designs MUST preserve applicable business rules, approvals,
permissions, and operational requirements. Business behavior MUST NOT be simplified solely to
make implementation easier. This ensures the platform serves operations rather than forcing
operations to conform to technical shortcuts.

### II. Modular Architecture
Every feature MUST be an independently owned module with clearly defined interfaces and shared
domain models. Modules MUST NOT depend on another module's internal implementation. Adding a new
module MUST NOT require modifying existing modules except to extend an explicit shared contract.
The architecture MUST remain extensible to new educational products, departments, workflows,
and AI capabilities.

### III. Dynamic Configuration
Business entities, including products, product types, branches, departments, roles, statuses,
payment methods, expense categories, and lead sources, MUST NOT be hardcoded. Such entities MUST
be configurable through administration interfaces and represented through typed service-layer
contracts. Defaults MAY be seeded, but application behavior MUST treat them as configurable
data.

### IV. Reusable Components
Pages MUST be assembled from shared design-system components. Forms, tables, dialogs, badges,
filters, cards, charts, layouts, loading states, and empty states MUST reuse an existing shared
component or establish one when the pattern recurs. Duplicated UI implementations are
prohibited. Reusable components MUST expose consistent behavior without absorbing feature
business logic.

### V. Frontend Separation
Business logic MUST NOT live in pages or presentational UI components. Pages orchestrate
features, features own business behavior, and components render data and expose user
interactions. Pages MUST communicate with data only through feature service functions. Dummy
data MUST remain behind those services so APIs can replace it without changing pages or
components.

### VI. Accessibility
Accessibility is a functional requirement. Every screen MUST support keyboard navigation,
deliberate focus management, screen-reader-compatible names and semantics, semantic HTML, and
sufficient color contrast. Acceptance criteria and validation tasks MUST cover these behaviors;
an inaccessible primary workflow is incomplete.

### VII. RTL Native
Arabic MUST be the primary language and RTL MUST be the default design direction. Layouts,
spacing, tables, forms, icons, navigation, and typography MUST behave naturally in RTL rather
than relying on a later visual translation. Content and direction concerns MUST remain separable
so additional languages can be added without redesigning feature architecture.

### VIII. Responsive by Default
Every feature MUST function correctly on desktop, laptop, and tablet viewports. Layout and
interaction architecture MUST allow future mobile support without redesign. Specifications MUST
define responsive behavior, and validation MUST cover the supported viewport classes.

### IX. Consistency Over Creativity
Every module MUST use the platform's shared visual language, spacing, components, and interaction
patterns. A feature MUST NOT introduce a separate design system or interaction model. Novel
patterns require a documented operational need and explicit approval; consistency takes
precedence over visual experimentation.

### X. AI Ready
Every module MUST expose sufficient typed domain context through its service and entity contracts
for future AI agents, automation workflows, knowledge bases, recommendations, summaries, and
routing. Designs MUST NOT assume a human is always the primary operator. AI readiness MUST NOT
weaken authorization, validation, auditability, or human oversight requirements.

## Technical Principles

- **Architecture**: The codebase MUST use feature-based architecture. Each feature owns its
  components, hooks, types, schemas, services, constants, dummy data, and utilities. Code belongs
  in shared directories only when it is genuinely cross-feature.
- **State management**: Server state MUST use TanStack Query. Cross-feature global client state
  MUST use Zustand. React local state MUST be limited to local UI interactions.
- **Forms and validation**: Forms MUST use React Hook Form with Zod schemas. A validation rule
  MUST have one authoritative schema and MUST NOT be duplicated across layers.
- **Tables**: Every data table MUST use the single shared TanStack Table implementation and MUST
  support applicable search, filtering, sorting, pagination, row selection, bulk actions,
  loading states, and empty states.
- **User feedback**: Notifications MUST use Sonner. Native browser alerts are prohibited. Every
  user action MUST expose loading, success, and failure feedback, and every data surface MUST
  define an empty state. Silent failures are prohibited.
- **Approved UI stack**: Icons MUST use Lucide, rich text MUST use Tiptap, charts MUST use
  Recharts, and file uploads MUST use react-dropzone. Styling MUST use Tailwind CSS and shared UI
  components MUST use shadcn/ui. Inline styles are prohibited.
- **Routing and rendering**: The application MUST use the Next.js App Router, with each feature
  owning its route segment. Server Components MUST be preferred when interactivity is
  unnecessary; Client Components MUST be minimized. Before changing Next.js code, contributors
  MUST read the relevant repository-local guidance in `node_modules/next/dist/docs/`.
- **Naming and type safety**: Files, variables, components, types, and routes MUST use consistent
  English names; user-facing copy MAY be Arabic. TypeScript strict mode is mandatory. `any` MUST
  be avoided unless the reason and containment boundary are documented.
- **Performance**: Implementations MUST avoid unnecessary rerenders and MUST optimize large
  tables and lists. Plans MUST document material client boundaries and performance risks.

## Future Compatibility

Every feature MUST preserve extension points for authentication, authorization, API integration,
AI agents, multiple branches, multiple tenants, audit logs, workflow automation, reporting, and
notifications. Specifications MUST identify applicable permission and tenant boundaries even
when their integrations are deferred. Architectural decisions that block these capabilities are
prohibited unless approved as a documented constitutional exception.

## Decision Rule

When several compliant approaches exist, contributors MUST choose the option that is, in order:
(1) more maintainable, (2) more reusable, (3) more scalable, (4) easier to connect to future
backend services, and (5) more consistent with the platform architecture. Short-term delivery
speed MUST NOT compromise long-term maintainability. Any exception MUST document the competing
options, operational need, impact, and approval.

## Governance

This Constitution takes precedence over specifications, plans, tasks, and implementation choices.
Conflicts MUST be resolved in favor of the Constitution unless it is formally amended first.

Amendments require a written proposal describing the change, rationale, affected artifacts, and
migration work. Approval MUST be explicit, and the constitution, Sync Impact Report, and affected
templates MUST be updated together. Versions follow semantic versioning: MAJOR for incompatible
governance changes or principle removals/redefinitions, MINOR for new principles or materially
expanded obligations, and PATCH for non-semantic clarifications.

Every specification and implementation plan MUST pass a Constitution Check before work is
scheduled and again after design. Every pull request MUST verify the applicable constitutional
requirements and record approved exceptions in the plan's Complexity Tracking table. Reviews
MUST reject hardcoded business entities, business logic in UI components, direct page-level data
access, duplicated UI, inaccessible or non-RTL workflows, silent failures, and unapproved stack
deviations. Compliance MUST be reviewed again before a feature is considered complete.

**Version**: 2.0.0 | **Ratified**: 2026-07-31 | **Last Amended**: 2026-07-31
