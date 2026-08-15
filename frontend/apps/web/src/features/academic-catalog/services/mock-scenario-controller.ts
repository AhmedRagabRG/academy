export type CatalogMockScenario =
  | "success"
  | "loading"
  | "scale"
  | "empty"
  | "unavailable"
  | "forbidden"
  | "duplicate"
  | "conflict"
  | "dependency"
  | "transition"
  | "activation"
  | "asset"
  | "error"
let scenario: CatalogMockScenario = "success"
export const catalogMockScenarios = {
  get: () => scenario,
  set: (next: CatalogMockScenario) => {
    scenario = next
  },
  reset: () => {
    scenario = "success"
  },
  wait: async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, scenario === "loading" ? 800 : 120)
    )
  },
}
