export const contactsPermissions = {
  view: "contacts.view",
  create: "contacts.create",
  update: "contacts.update",
  delete: "contacts.delete",
  import: "contacts.import",
  export: "contacts.export",
  manageGroups: "contacts.groups.manage",
  manageCustomFields: "contacts.fields.manage",
  manageNotes: "contacts.notes.manage",
} as const

export type ContactsPermission =
  (typeof contactsPermissions)[keyof typeof contactsPermissions]
