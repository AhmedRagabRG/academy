import { afterEach, describe, expect, it } from "vitest"
import { admissionsService } from "@/features/admissions/services/mock-admissions-service"
import { admissionScenarios } from "@/features/admissions/services/mock-scenario-controller"
import { defaultAdmissionListQuery } from "@/features/admissions/utils/admission-list-query"

afterEach(() => admissionScenarios.reset())

describe.sequential("deterministic admissions states", () => {
  it("supports true empty and unavailable states", async () => {
    admissionScenarios.set("empty")
    await expect(
      admissionsService.list(defaultAdmissionListQuery)
    ).resolves.toMatchObject({
      items: [],
      total: 0,
    })
    admissionScenarios.set("unavailable")
    await expect(
      admissionsService.list(defaultAdmissionListQuery)
    ).rejects.toMatchObject({
      kind: "unavailable",
    })
  })

  it("honors AbortSignal cancellation during latency", async () => {
    admissionScenarios.set("latency")
    const controller = new AbortController()
    const result = admissionsService.list(
      defaultAdmissionListQuery,
      controller.signal
    )
    controller.abort()
    await expect(result).rejects.toMatchObject({ name: "AbortError" })
  })
})
