export const ticketPermissions = {
  viewAssigned: "tickets.view.assigned",
  viewTeam: "tickets.view.team",
  viewAll: "tickets.view.all",
  create: "tickets.create",
  edit: "tickets.edit",
  assignTeam: "tickets.assign.team",
  assignEmployee: "tickets.assign.employee",
  reassign: "tickets.reassign",
  changeStatus: "tickets.change.status",
  changePriority: "tickets.change.priority",
  archive: "tickets.archive",
  comment: "tickets.comment",
  attach: "tickets.attach.files",
  restore: "tickets.restore",
  delete: "tickets.delete",
} as const

export const allTicketPermissions = Object.values(ticketPermissions)
