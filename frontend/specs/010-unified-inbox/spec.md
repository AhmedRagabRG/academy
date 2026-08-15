# Feature Specification: Unified Inbox

**Feature Branch**: `main`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "Build a fully mock-driven unified Inbox frontend for education operations, supporting multichannel conversations, collaboration, assignment, permissions, search, filtering, responsive layouts, and disabled future AI placeholders."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Triage permitted conversations (Priority: P1)

An employee opens a unified list of customer conversations, sees only conversations permitted by their visibility scope, and uses saved views, summaries, search, sorting, and combined filters to find work requiring attention.

**Why this priority**: Finding the right conversation is the entry point for every inbox workflow and protects private operational data.

**Independent Test**: Load the inbox as users with assigned-only, team, and global scopes; verify each sees the correct mock conversations and can locate a known conversation using each supported discovery control.

**Acceptance Scenarios**:

1. **Given** an employee with assigned-only visibility, **When** the inbox opens, **Then** only conversations assigned directly to that employee are shown and all summary counts reflect that same permitted set.
2. **Given** a manager with team visibility, **When** they select My Team and combine status, platform, tag, branch, unread, and date filters, **Then** only matching conversations assigned to their team remain.
3. **Given** an authorized global user, **When** they search by customer name, phone number, message content, or tag, **Then** matching open, closed, and archived conversations within the mock dataset are returned.
4. **Given** no conversations match the active view and filters, **When** results are evaluated, **Then** a clear empty state explains why and allows the employee to clear filters.

---

### User Story 2 - Read and reply in context (Priority: P1)

An employee selects a conversation, reads its day-grouped message history and attachments, reviews customer context without leaving the workspace, and sends a mocked reply when permitted.

**Why this priority**: Resolving customer needs from one workspace is the Inbox's central value.

**Independent Test**: Select a seeded conversation containing every supported message type, review its customer details, compose a reply with and without a mock attachment, and verify the new outgoing message appears with timestamp and delivery state.

**Acceptance Scenarios**:

1. **Given** a permitted conversation, **When** it is selected, **Then** its header, chronological day-grouped messages, customer information, assignments, tags, and status are visible together.
2. **Given** reply permission, **When** the employee enters text and sends it, **Then** a mocked outgoing message appears immediately with sender, timestamp, and delivery status and the list preview updates.
3. **Given** reply permission, **When** the employee selects an image, PDF, document, or placeholder video attachment, **Then** a mock preview is shown and the employee can remove or send it.
4. **Given** no reply permission, **When** the conversation opens, **Then** reply controls are unavailable while permitted reading actions remain usable.

---

### User Story 3 - Manage conversation workflow (Priority: P2)

An authorized employee updates a conversation's status, employee/team assignment, and tags, archives it when appropriate, and can inspect the immutable assignment history.

**Why this priority**: Ownership and lifecycle controls make conversations operationally manageable across teams.

**Independent Test**: With each relevant permission enabled and disabled, assign and reassign a conversation, remove assignments, change status, manage multiple tags, archive it, and verify immediate UI and history updates.

**Acceptance Scenarios**:

1. **Given** assignment permission, **When** an employee assigns or reassigns an employee, a team, or both, **Then** the current assignment updates everywhere and a history event records previous assignment, new assignment, actor, date, and time.
2. **Given** reassign permission is absent, **When** a conversation is already assigned, **Then** reassignment and removal actions are not offered.
3. **Given** status-change permission, **When** the employee chooses Open, Pending, Snoozed, Closed, or Archived, **Then** the status updates immediately across the workspace, list, views, and summaries.
4. **Given** tag-management permission, **When** the employee adds or removes one or more tags, **Then** colored tag badges update without affecting unrelated conversations.
5. **Given** archive permission, **When** the employee confirms archive, **Then** the conversation moves to Archived and remains discoverable by authorized users.

---

### User Story 4 - Collaborate with private notes (Priority: P2)

An authorized employee adds private internal notes, and can edit or delete only notes they authored.

**Why this priority**: Private context enables handoffs and collaboration without exposing internal discussion to customers.

**Independent Test**: Add notes as two mock employees; verify both employees can read them, each can edit/delete only their own, and notes are visually distinct from customer-visible messages.

**Acceptance Scenarios**:

1. **Given** note-management permission, **When** an employee adds a note, **Then** it displays author, date, content, and an unmistakable employee-only indicator.
2. **Given** an employee viewing their own note, **When** they edit or delete it, **Then** the note updates or disappears immediately after confirmation.
3. **Given** an employee viewing another employee's note or lacking note permission, **When** note actions are evaluated, **Then** unauthorized create, edit, and delete controls are unavailable.

---

### User Story 5 - Work across supported viewports (Priority: P3)

An employee can complete the primary inbox workflow in Arabic and RTL on desktop, laptop, and tablet, with an adapted mobile presentation that preserves essential reading and reply access.

**Why this priority**: The workspace must remain usable across operational devices and meet platform language and accessibility obligations.

**Independent Test**: Complete conversation discovery, selection, reading, reply, and permitted management using keyboard and assistive technology at each supported viewport and inspect the adapted mobile layout.

**Acceptance Scenarios**:

1. **Given** an Arabic RTL session on desktop or laptop, **When** the inbox opens, **Then** list, workspace, customer sidebar, controls, spacing, icons, and message direction read naturally from right to left.
2. **Given** a tablet viewport, **When** an employee navigates between list, conversation, and customer information, **Then** all primary actions remain available without clipped content or horizontal page scrolling.
3. **Given** keyboard-only use, **When** the employee traverses and operates the inbox, **Then** focus order is logical, focus is visible, dialogs manage focus, and every interactive control has an accessible name.
4. **Given** a mobile viewport, **When** the employee opens the inbox, **Then** essential list, reading, and reply workflows remain usable through a single-pane adapted layout.

---

### User Story 6 - Preview future AI affordances (Priority: P3)

An employee can see where future AI assistance will appear without being able to trigger non-existent AI behavior.

**Why this priority**: Stable placeholders prepare the experience for later capabilities while setting accurate expectations now.

**Independent Test**: Open AI summary, suggested reply, suggested tags, suggested assignment, sentiment, and knowledge-search areas and verify each is visibly disabled, explanatory, and never changes conversation data.

**Acceptance Scenarios**:

1. **Given** any conversation, **When** future AI sections are visible, **Then** every AI capability is labeled as unavailable or coming later and exposes no active action.
2. **Given** keyboard or assistive-technology navigation, **When** the employee encounters an AI placeholder, **Then** its disabled state and purpose are communicated without trapping focus.

### Edge Cases

- A permitted conversation becomes excluded after reassignment or a status/view change; the list and selection reconcile immediately and provide a sensible next state.
- A selected conversation is deleted from the mock session by an authorized administrator; the workspace closes and the list explains the change.
- Search input contains Arabic, Latin text, punctuation, partial phone numbers, or no matching value.
- Multiple filters conflict, dates are reversed, or a date range has no activity; validation and empty states remain clear.
- A conversation has no employee assignment, no team assignment, no tags, no messages, a missing avatar, very long content, or many unread messages.
- An attachment has a long filename, unsupported type, or exceeds the documented mock upload limit; it is rejected with a clear explanation and no partial send.
- A voice message or video has no playable media; it displays an explicit placeholder rather than a broken control.
- A user's permissions or visibility scope changes during the mock session; unauthorized data and actions disappear immediately.
- The final page or loaded segment contains fewer records than the configured page size, and no records are duplicated during navigation or loading.
- A note or message contains bidirectional Arabic and Latin content; its reading direction remains understandable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Inbox MUST provide one unified conversation list populated by realistic, relational mock data spanning multiple communication platforms.
- **FR-002**: Each conversation list item MUST show customer avatar and name, platform, last-message preview, last activity, unread count, status, assigned team, assigned employee, and tags, using explicit empty values where data is absent.
- **FR-003**: Employees MUST be able to search permitted conversations by customer name, phone number, message content, and tag, including closed and archived conversations.
- **FR-004**: Employees MUST be able to sort conversations and combine filters for platform, status, employee, team, tags, branch, unread state, and activity date, and MUST be able to clear filters individually or together.
- **FR-005**: The Inbox MUST provide All Conversations, Assigned to Me, My Team, Unassigned, Closed, and Archived saved views, hiding views a user is not permitted to access.
- **FR-006**: The Inbox MUST provide Assigned to Me, Open Conversations, Pending Conversations, Unread Conversations, and Closed Today summaries calculated only from conversations visible to the current user.
- **FR-007**: The conversation list MUST support deterministic pagination or progressive loading, communicate loading and completion, and preserve the employee's current search, sort, filter, and saved-view context during the session.
- **FR-008**: Selecting a conversation MUST open a workspace containing a conversation header, day-grouped message history, composer area, and customer information without navigating away from Inbox context.
- **FR-009**: The conversation header MUST show customer identity, platform, current status, employee/team assignments, tags, and only those quick actions the current user may perform.
- **FR-010**: Message history MUST distinguish incoming messages, outgoing messages, internal notes, and system events and show sender, timestamp, and mock delivery status where applicable.
- **FR-011**: Message history MUST display text, images, PDFs, documents, voice placeholders, and video placeholders with appropriate type, metadata, and unavailable states.
- **FR-012**: Employees with `inbox.reply` MUST be able to compose and mock-send text, emojis, and supported attachments; empty sends MUST be prevented and sending MUST update the conversation preview and activity time.
- **FR-013**: Mock attachment selection MUST support preview and removal before sending and MUST provide clear rejection feedback for unsupported or over-limit selections.
- **FR-014**: The customer sidebar MUST show name, phone number, communication platform, branch, employee/team assignments, first-contact date, and last activity, plus disabled placeholders for Student Profile, Admission, and Financial Status.
- **FR-015**: Employees with `inbox.change.status` MUST be able to change status among Open, Pending, Snoozed, Closed, and Archived, with immediate consistent updates across all visible surfaces.
- **FR-016**: Employees with `inbox.manage.tags` MUST be able to add and remove multiple configurable tags; tags MUST be distinguishable by both text and color.
- **FR-017**: Employees with `inbox.manage.notes` MUST be able to add private notes and edit or delete only their own notes; all employees permitted to view the conversation MAY read its notes.
- **FR-018**: Internal notes MUST be clearly marked employee-only and MUST never be presented as customer-visible messages or outgoing replies.
- **FR-019**: Employees with the applicable assignment permissions MUST be able to assign, reassign, or remove an employee, a team, or both; `inbox.reassign` MUST govern changes to an existing assignment.
- **FR-020**: Every assignment change MUST append an immutable history event containing previous assignment, new assignment, performer, date, and time; history events MUST not expose edit or delete actions.
- **FR-021**: Visibility MUST apply the most permissive granted scope: `inbox.view.all` shows every conversation, otherwise `inbox.view.team` shows conversations assigned to the user's team, otherwise `inbox.view.assigned` shows conversations directly assigned to the user; no visibility permission shows a forbidden state and no conversation data.
- **FR-022**: Actions MUST be shown or hidden according to `inbox.assign.employee`, `inbox.assign.team`, `inbox.reassign`, `inbox.reply`, `inbox.change.status`, `inbox.manage.tags`, `inbox.manage.notes`, `inbox.archive`, `inbox.delete`, and `inbox.restore` mock permissions.
- **FR-023**: Authorized administrators MUST be able to delete and restore conversations in the mock session, with confirmation and immediate list, selection, view, and summary updates; other users MUST NOT see these actions.
- **FR-024**: Closed and archived conversations MUST remain searchable and readable by authorized users, subject to visibility scope.
- **FR-025**: The Inbox MUST provide disabled, explanatory placeholders for AI conversation summary, suggested reply, suggested tags, suggested assignment, sentiment analysis, and knowledge search, and MUST perform no AI processing.
- **FR-026**: Mock datasets MUST include related customers, employees, teams, branches, conversations, messages, attachments, configurable tags, notes, and assignment history sufficient to demonstrate populated, empty, boundary, and permission-restricted states.
- **FR-027**: All mocked mutations MUST behave consistently for the active session, updating every affected surface while making clear that the environment uses demonstration data.
- **FR-028**: Every data surface and user action MUST define loading, empty, success, failure, unavailable, and forbidden feedback as applicable, without silent failure.
- **FR-029**: The Inbox MUST use Arabic as the primary language and RTL as the default direction while keeping content localizable and correctly handling mixed-direction content.
- **FR-030**: Primary discovery, reading, reply, assignment, status, tag, and note workflows MUST support keyboard operation, deliberate focus management, accessible names and semantics, and sufficient non-color indicators.
- **FR-031**: The complete experience MUST function on desktop, laptop, and tablet; mobile MUST provide an adapted single-pane experience for essential discovery, reading, and reply workflows without requiring a redesign for future enhancement.

### Constitution Requirements *(mandatory for UI features)*

- **Business Workflow**: Employees triage only visible conversations, communicate with customers, collaborate privately, manage ownership and lifecycle according to granular permissions, and preserve immutable assignment history.
- **Module Boundary**: Inbox owns conversation discovery, workspace interactions, customer conversation context, mock permissions, and mock mutations. It consumes shared employee, team, branch, and permission identities through explicit contracts and does not own their administration.
- **Dynamic Configuration**: Communication platforms, branches, teams, employees, conversation statuses, and tags are treated as configurable business data. Examples may be seeded for the mock experience but are not fixed business rules.
- **Arabic & RTL**: Arabic copy and RTL layout are primary; list/workspace/sidebar order, message alignment, controls, dates, mixed-direction content, and icons behave naturally in RTL while remaining localization-ready.
- **Responsive & Accessibility**: Desktop is the primary three-pane workspace; laptop and tablet adapt without losing primary actions; mobile uses a navigable single-pane presentation. All primary workflows support keyboard, visible focus, assistive semantics, adequate contrast, and focus restoration.
- **UI States**: Lists, conversations, messages, attachments, customer data, notes, assignments, and mutations include appropriate loading, empty, error, success, unavailable, and forbidden states.
- **Reuse**: The experience follows the platform's shared visual language and recurring patterns for layout, lists, summaries, search, filters, badges, dialogs, forms, attachments, loading, and empty states.
- **Frontend Boundary**: Pages orchestrate Inbox views, the Inbox feature owns business behavior, and all mock data and mutations remain behind replaceable feature service boundaries so future data integration does not change user-facing workflows.
- **AI & Future Context**: Conversation, participant, assignment, permission, tag, message, note, attachment, tenant, branch, and audit context remains available for future authorized automation. AI placeholders are disabled, and future AI actions must preserve authorization, validation, auditability, tenant isolation, and human oversight.

### Key Entities *(include if feature involves data)*

- **Conversation**: A customer communication thread belonging to exactly one platform, with status, activity, unread count, customer, optional team and employee assignments, tags, messages, notes, and history.
- **Customer**: The person communicating with the institution, identified by name, avatar, phone, platform identity, branch relationship, and contact activity; future student, admission, and finance links are placeholders only.
- **Employee**: An authenticated staff member with team membership, visibility scope, granular Inbox permissions, and authorship of replies, notes, and assignment changes.
- **Team**: A configurable operational group that can own conversations and define team-scope visibility.
- **Message**: A chronological incoming or outgoing communication containing content, sender, timestamp, type, attachments, and mock delivery state.
- **Attachment**: Media or file metadata associated with a message, classified as image, PDF, document, voice, or video.
- **Tag**: A configurable, color-associated label that may be attached many-to-many to conversations.
- **Internal Note**: Employee-only conversation content with author, creation date, and editable ownership rules.
- **Assignment History Event**: An immutable record of the previous and new team/employee assignment, actor, date, and time.
- **Saved View**: A named, permission-aware conversation subset used for rapid operational navigation.
- **Inbox Permission Profile**: The mock set of visibility and action grants governing which conversations and controls an employee can access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of representative employees can locate a specified permitted conversation using search, a saved view, or combined filters in under 30 seconds on their first attempt.
- **SC-002**: At least 95% of representative employees can open a conversation, understand its customer context, and send a mocked text reply in under 60 seconds without assistance.
- **SC-003**: Across the complete seeded dataset and all mock permission profiles, 100% of restricted conversations and restricted actions remain unavailable to users who lack the required visibility or action permission.
- **SC-004**: Assignment, status, tag, note, archive, delete, and restore changes appear consistently on all affected visible surfaces within one second of confirmation in at least 99% of scripted interactions.
- **SC-005**: Search and combined filters return the correct expected records from a dataset of at least 500 conversations within one second for at least 95% of test attempts on supported devices.
- **SC-006**: At least 90% of representative employees can assign or reassign a conversation and verify the resulting assignment history in under 45 seconds without assistance.
- **SC-007**: All primary workflows can be completed using keyboard alone at desktop, laptop, and tablet sizes, with no critical accessibility violations in the evaluated screens.
- **SC-008**: No supported desktop, laptop, or tablet viewport has clipped primary actions or horizontal page scrolling, and essential mobile discovery, reading, and reply flows remain completable.
- **SC-009**: In usability evaluation, at least 85% of employees rate the Inbox's clarity and familiarity at 4 or higher on a 5-point scale.
- **SC-010**: Every future AI area is recognized as unavailable by 100% of test participants and produces zero conversation-data changes.

## Assumptions

- Employees are already authenticated, have a current branch/team identity, and receive a seeded permission profile; authentication and permission administration are outside this feature.
- The feature is a demonstration experience: all data and mutations are local mock behavior for the active session and do not persist as production records.
- The seeded dataset represents multiple generic communication platforms without connecting to WhatsApp, Facebook, Instagram, or any external provider.
- When multiple visibility permissions are granted, the broadest granted scope applies; action permissions remain independent.
- `inbox.archive` controls archive operations, while `inbox.change.status` controls other status changes. Delete and restore are separate administrative actions.
- Snoozed is represented as a status in this release; scheduling an automatic reopen time is outside scope.
- Notes may be edited or deleted only by their author; no elevated override is assumed for this release.
- A practical mock attachment size limit and supported filename rules will be documented in the interface; no real upload or malware scanning occurs.
- Timestamps and date filters use the employee's displayed local time, while seeded records remain internally consistent across views.
- The primary supported viewport classes are desktop, laptop, and tablet per platform governance; the requested mobile experience covers essential workflows through an adapted layout.
- Ticket management, knowledge base functionality, external channel integration, and all active AI behavior remain outside scope.
