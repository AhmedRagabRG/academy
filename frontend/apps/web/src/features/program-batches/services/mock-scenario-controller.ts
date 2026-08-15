export type BatchScenario =
  | "success"
  | "latency"
  | "empty"
  | "forbidden"
  | "duplicate"
  | "stale"
  | "unavailable"
  | "unexpected"
let scenario: BatchScenario = "success"
export { buildScaleBatches } from "../data/program-batch-scale-fixtures"
export const batchScenarios = {
  set: (value: BatchScenario) => {
    scenario = value
  },
  get: () => scenario,
  reset: () => {
    scenario = "success"
  },
}
