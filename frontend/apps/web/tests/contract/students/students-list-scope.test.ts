import { beforeEach, describe, expect, it } from "vitest"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import { studentScenarios } from "@/features/students/services/mock-scenario-controller"
import type { StudentId } from "@/features/students/types/common"

const baseQuery = { page: 1, pageSize: 50 }

describe("student list scope and permissions", () => {
  beforeEach(() => resetStudentStore())

  it("returns every seeded student for an organization-wide context", async () => {
    const page = await studentsService.list(baseQuery)
    expect(page.total).toBe(7)
    expect(page.items.every((item) => item.studentCode.startsWith("STD-"))).toBe(
      true
    )
  })

  it("restricts the list to intersecting branches for a scoped employee", async () => {
    studentScenarios.scopeToBranches(["branch-cairo"])
    const page = await studentsService.list(baseQuery)

    expect(page.total).toBeGreaterThan(0)
    expect(page.total).toBeLessThan(7)
    for (const item of page.items)
      expect(
        [item.registrationBranchLabel, item.studyBranchLabel].some((label) =>
          label.includes("القاهرة")
        )
      ).toBe(true)
  })

  it("refuses direct access to an out-of-scope student", async () => {
    const all = await studentsService.list(baseQuery)
    const alexOnly = all.items.find(
      (item) =>
        item.registrationBranchLabel.includes("الإسكندرية") &&
        item.studyBranchLabel.includes("الإسكندرية")
    )
    expect(alexOnly).toBeDefined()

    studentScenarios.scopeToBranches(["branch-cairo"])
    await expect(
      studentsService.get(alexOnly!.id as StudentId)
    ).rejects.toMatchObject({ code: "out-of-scope" })
  })

  it("masks contact values in scoped list projections", async () => {
    studentScenarios.scopeToBranches(["branch-cairo"])
    const page = await studentsService.list(baseQuery)
    for (const item of page.items) expect(item.phoneHint).toContain("•")
  })

  it("never returns identifiers, addresses, or notes in the list projection", async () => {
    const page = await studentsService.list(baseQuery)
    const row = page.items[0] as unknown as Record<string, unknown>
    expect(row).not.toHaveProperty("nationalId")
    expect(row).not.toHaveProperty("address")
    expect(row).not.toHaveProperty("notes")
    expect(row).not.toHaveProperty("identity")
  })

  it("refuses listing without students.view", async () => {
    studentScenarios.withoutPermissions(["students.view"])
    await expect(studentsService.list(baseQuery)).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("refuses export without students.export", async () => {
    studentScenarios.withoutPermissions(["students.export"])
    await expect(studentsService.exportList(baseQuery)).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("exports only rows the employee may see", async () => {
    studentScenarios.scopeToBranches(["branch-cairo"])
    const csv = await studentsService.exportList(baseQuery)
    const scopedPage = await studentsService.list(baseQuery)
    expect(csv.trim().split("\n")).toHaveLength(scopedPage.total + 1)
  })
})

describe("student list search, filter, sort, page", () => {
  beforeEach(() => resetStudentStore())

  it("searches by name, code, phone, guardian phone, and national identifier", async () => {
    const byName = await studentsService.list({ ...baseQuery, search: "يوسف" })
    expect(byName.total).toBe(1)

    const byCode = await studentsService.list({
      ...baseQuery,
      search: "STD-2026-00002",
    })
    expect(byCode.total).toBe(1)

    const byPhone = await studentsService.list({
      ...baseQuery,
      search: "01012345678",
    })
    expect(byPhone.total).toBe(1)

    const byGuardian = await studentsService.list({
      ...baseQuery,
      search: "01098765432",
    })
    expect(byGuardian.total).toBe(1)

    const byNationalId = await studentsService.list({
      ...baseQuery,
      search: "30304120101234",
    })
    expect(byNationalId.total).toBe(1)
  })

  it("matches Arabic spelling variants and Arabic-Indic digits", async () => {
    const withHamza = await studentsService.list({
      ...baseQuery,
      search: "منه الله",
    })
    expect(withHamza.total).toBe(1)

    const arabicDigits = await studentsService.list({
      ...baseQuery,
      search: "٠١٠١٢٣٤٥٦٧٨",
    })
    expect(arabicDigits.total).toBe(1)
  })

  it("satisfies every filter simultaneously when combined", async () => {
    const combined = await studentsService.list({
      ...baseQuery,
      statuses: ["active"],
      departmentIds: ["department-it"],
      branchIds: ["branch-main"],
    })
    for (const item of combined.items) {
      expect(item.status).toBe("active")
      expect(item.departmentLabel).toBe("تقنية المعلومات")
    }
  })

  it("filters by offering and by batch through enrollments", async () => {
    const byOffering = await studentsService.list({
      ...baseQuery,
      offeringIds: ["offering-program-fullstack"],
    })
    expect(byOffering.total).toBeGreaterThan(0)

    const byBatch = await studentsService.list({
      ...baseQuery,
      batchIds: ["batch-fs-2026-a"],
    })
    expect(byBatch.total).toBe(1)
  })

  it("returns an empty page rather than an error when nothing matches", async () => {
    const page = await studentsService.list({
      ...baseQuery,
      search: "لا-يوجد-طالب-بهذا-الاسم",
    })
    expect(page.items).toEqual([])
    expect(page.total).toBe(0)
    expect(page.totalPages).toBe(1)
  })

  it("sorts by the requested field and direction", async () => {
    const ascending = await studentsService.list({
      ...baseQuery,
      sort: { field: "studentCode", direction: "asc" },
    })
    const codes = ascending.items.map((item) => item.studentCode)
    expect(codes).toEqual([...codes].sort())
  })

  it("clamps a page that is no longer valid after filtering", async () => {
    const page = await studentsService.list({
      page: 9,
      pageSize: 2,
      statuses: ["active"],
    })
    expect(page.page).toBeLessThanOrEqual(page.totalPages)
    expect(page.items.length).toBeGreaterThan(0)
  })

  it("pages without overlap or gaps", async () => {
    const first = await studentsService.list({ page: 1, pageSize: 3 })
    const second = await studentsService.list({ page: 2, pageSize: 3 })
    const overlap = first.items.filter((item) =>
      second.items.some((other) => other.id === item.id)
    )
    expect(overlap).toEqual([])
  })
})
