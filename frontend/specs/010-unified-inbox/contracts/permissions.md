# Contract: Inbox Permissions

## Permission keys

| Key | Meaning |
|---|---|
| `inbox.view.all` | Read every tenant conversation |
| `inbox.view.team` | Read conversations assigned to any current user's team |
| `inbox.view.assigned` | Read conversations assigned directly to current user |
| `inbox.assign.employee` | Set an employee on an unassigned conversation |
| `inbox.assign.team` | Set a team on an unassigned conversation |
| `inbox.reassign` | Change or remove an existing employee/team assignment, combined with target assignment grant |
| `inbox.reply` | Send a customer-visible mock reply |
| `inbox.change.status` | Change non-archive status |
| `inbox.manage.tags` | Add/remove conversation tags |
| `inbox.manage.notes` | Add notes and edit/delete own notes |
| `inbox.archive` | Archive a conversation |
| `inbox.delete` | Soft-delete a conversation |
| `inbox.restore` | Restore archived/deleted conversation |

## Visibility resolution

The service resolves one effective scope using the broadest grant:

1. `inbox.view.all`: tenant-wide conversations.
2. Else `inbox.view.team`: conversations whose assigned team is in the current employee's team memberships.
3. Else `inbox.view.assigned`: conversations assigned directly to the current employee.
4. Else: forbidden Inbox state with no conversation data or counts.

Branch filters narrow results after authorization and never expand visibility. Unassigned conversations require global visibility because they match neither team nor direct assignment.

## Enforcement rules

- Every read, direct detail lookup, search, dashboard count, saved-view count, message/note/history read, and AI-context projection applies visibility before returning data.
- Every command rechecks visibility and action permission inside the service even when its UI control is absent.
- Existing assignment changes require `inbox.reassign` plus the permission for every non-null target being changed.
- Removing an employee or team from an existing assignment requires `inbox.reassign`.
- A note's author ID must equal the current employee ID for edit/delete; `inbox.manage.notes` alone is insufficient.
- Archive, change status, delete, and restore are independent grants.
- UI capabilities are projections for usability, not the authorization boundary.

## UI behavior

- Saved views outside effective scope are omitted.
- Unauthorized actions are omitted from menus and quick actions.
- If a permission changes while a panel is open, pending unauthorized actions are canceled, protected panels close, and queries refetch under the new scope fingerprint.
- A user with no visibility grant sees a full forbidden state, not an empty Inbox.
- Disabled AI placeholders are visible only when their underlying conversation context is visible.

## Required personas

Fixtures include at least:

- Assigned employee: assigned visibility plus reply and note permissions.
- Team lead: team visibility, reply, status, employee/team assignment, reassign, tags, and notes.
- Global administrator: all visibility and every action including delete/restore.
- Read-only auditor: all visibility with no mutation grants.
- No-access employee: no Inbox visibility permission.
