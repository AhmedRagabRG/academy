export const pipelineAdminKeys = {
  all: ["pipeline-admin"] as const,
  list: () => ["pipeline-admin", "list"] as const,
  detail: (id: string) => ["pipeline-admin", "detail", id] as const,
}
