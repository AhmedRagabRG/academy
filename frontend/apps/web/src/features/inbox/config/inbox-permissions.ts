export const inboxPermissions = {
  viewAll: "inbox.view.all",
  viewTeam: "inbox.view.team",
  viewAssigned: "inbox.view.assigned",
  assignEmployee: "inbox.assign.employee",
  assignTeam: "inbox.assign.team",
  reassign: "inbox.reassign",
  reply: "inbox.reply",
  changeStatus: "inbox.change.status",
  manageTags: "inbox.manage.tags",
  manageNotes: "inbox.manage.notes",
  archive: "inbox.archive",
  delete: "inbox.delete",
  restore: "inbox.restore",
  aiControl: "inbox.ai.control",
} as const

export type InboxPermission =
  (typeof inboxPermissions)[keyof typeof inboxPermissions]
