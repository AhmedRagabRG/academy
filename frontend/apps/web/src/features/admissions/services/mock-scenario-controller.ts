export type AdmissionScenario =
  | "success"
  | "latency"
  | "empty"
  | "forbidden"
  | "scope-forbidden"
  | "not-found"
  | "duplicate"
  | "stale"
  | "unavailable"
  | "upload-interrupted"
  | "partial-bulk"
  | "unexpected"

let scenario: AdmissionScenario = "success"

export const admissionScenarios = {
  get: () => scenario,
  set: (next: AdmissionScenario) => {
    scenario = next
  },
  reset: () => {
    scenario = "success"
  },
}

export async function applyAdmissionScenario(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  const wait = scenario === "latency" ? 650 : 80
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, wait)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true }
    )
  })
}
