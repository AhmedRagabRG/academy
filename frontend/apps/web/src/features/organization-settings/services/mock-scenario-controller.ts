export type MockScenario = "success" | "empty" | "validation" | "conflict" | "dependency" | "permission" | "error"
let scenario: MockScenario = "success"
let latency = 120
export const mockScenarioController = {
  get: () => scenario,
  set: (next: MockScenario) => { scenario = next },
  reset: () => { scenario = "success"; latency = 120 },
  setLatency: (milliseconds: number) => { latency = Math.max(0, milliseconds) },
  wait: () => new Promise((resolve) => setTimeout(resolve, latency)),
}
