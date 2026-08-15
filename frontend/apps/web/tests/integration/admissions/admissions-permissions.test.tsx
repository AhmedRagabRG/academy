import { afterEach, describe, expect, it } from "vitest"
import {
  admissionsService,
  setAdmissionServiceContext,
} from "@/features/admissions/services/mock-admissions-service"
import {
  defaultAdmissionContext,
  type AdmissionServiceContext,
} from "@/features/admissions/utils/admissions-scope"
import { defaultAdmissionListQuery } from "@/features/admissions/utils/admission-list-query"

afterEach(() => setAdmissionServiceContext(defaultAdmissionContext))

const context = (
  patch: Partial<AdmissionServiceContext>
): AdmissionServiceContext => ({ ...defaultAdmissionContext, ...patch })

describe.sequential("admissions permission and scope enforcement", () => {
  it("blocks direct service access without the exact action permission", async () => {
    setAdmissionServiceContext(context({ permissions: [] }))
    await expect(
      admissionsService.list(defaultAdmissionListQuery)
    ).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("returns not-found instead of leaking an out-of-scope detail", async () => {
    setAdmissionServiceContext(
      context({ organizationWide: false, authorizedBranchIds: ["branch-giza"] })
    )
    await expect(
      admissionsService.get("admission-mariam-1" as never)
    ).rejects.toMatchObject({ code: "not-found" })
  })

  it("separates view and export permissions", async () => {
    setAdmissionServiceContext(context({ permissions: ["admissions.view"] }))
    await expect(
      admissionsService.list(defaultAdmissionListQuery)
    ).resolves.toBeTruthy()
    await expect(
      admissionsService.exportList(defaultAdmissionListQuery)
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})
