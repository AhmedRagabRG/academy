export const pipelinePermissions = {
  view: "pipeline.view",
  create: "pipeline.create",
  update: "pipeline.update",
  move: "pipeline.move",
  assign: "pipeline.assign",
  manage: "pipeline.manage",
} as const

export type PipelinePermission =
  (typeof pipelinePermissions)[keyof typeof pipelinePermissions]
