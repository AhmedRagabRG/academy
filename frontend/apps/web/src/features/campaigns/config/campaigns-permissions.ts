export const campaignsPermissions = {
  view: "campaigns.view",
  create: "campaigns.create",
  update: "campaigns.update",
  delete: "campaigns.delete",
  launch: "campaigns.launch",
  syncTemplates: "campaigns.templates.sync",
} as const

export type CampaignsPermission =
  (typeof campaignsPermissions)[keyof typeof campaignsPermissions]
