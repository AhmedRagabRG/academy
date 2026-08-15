export type InboxScenario =
  | "default"
  | "empty"
  | "failure"
  | "conflict"
  | "missing-avatar"
  | "long-content"
  | "invalid-date"
  | "invalid-attachment"
  | "deleted-selection"
let scenario: InboxScenario = "default"
export const inboxScenarioController = {
  get: () => scenario,
  set: (next: InboxScenario) => {
    scenario = next
  },
  reset: () => {
    scenario = "default"
  },
}
