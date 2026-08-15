import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import { studentScenarios } from "@/features/students/services/mock-scenario-controller"
import { defaultStudentListQuery } from "@/features/students/utils/student-list-query"

/**
 * SC-004: search, filter, sort, and page interactions stay under 2 seconds at the
 * 95th percentile across 20,000 students. Measured against the deterministic scale
 * fixture through the same service path the UI uses.
 */

const SIZE = 20_000
const BUDGET_MS = 2000

async function percentile95(run: () => Promise<unknown>, samples = 20) {
  const timings: number[] = []
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now()
    await run()
    timings.push(performance.now() - started)
  }
  timings.sort((left, right) => left - right)
  return timings[Math.min(timings.length - 1, Math.ceil(samples * 0.95) - 1)] ?? 0
}

// Vitest's 5s default would otherwise act as a second, load-dependent budget:
// each case runs 20 samples over 20,000 records and contends with the full suite.
// The real performance guard is the p95 assertion inside each case.
const CASE_TIMEOUT_MS = 60_000

describe.sequential("student list at scale", () => {
  beforeEach(() => {
    resetStudentStore()
    studentScenarios.useScale(true, SIZE)
  })
  afterEach(() => studentScenarios.reset())

  it("loads the generated set", async () => {
    const page = await studentsService.list(defaultStudentListQuery)
    expect(page.total).toBeGreaterThanOrEqual(SIZE)
  }, CASE_TIMEOUT_MS)

  it("keeps a plain page load within budget", async () => {
    const p95 = await percentile95(() =>
      studentsService.list(defaultStudentListQuery)
    )
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps search within budget", async () => {
    const p95 = await percentile95(() =>
      studentsService.list({ ...defaultStudentListQuery, search: "أحمد" })
    )
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps combined filtering within budget", async () => {
    const p95 = await percentile95(() =>
      studentsService.list({
        ...defaultStudentListQuery,
        statuses: ["active"],
        branchIds: ["branch-main"],
        departmentIds: ["department-it"],
      })
    )
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps sorting within budget", async () => {
    const p95 = await percentile95(() =>
      studentsService.list({
        ...defaultStudentListQuery,
        sort: { field: "fullName", direction: "asc" },
      })
    )
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("keeps deep pagination within budget", async () => {
    const p95 = await percentile95(() =>
      studentsService.list({ ...defaultStudentListQuery, page: 500 })
    )
    expect(p95).toBeLessThan(BUDGET_MS)
  }, CASE_TIMEOUT_MS)

  it("never loads documents, notes, or timeline into a list row", async () => {
    const page = await studentsService.list(defaultStudentListQuery)
    const row = page.items[0] as unknown as Record<string, unknown>
    expect(row).not.toHaveProperty("documents")
    expect(row).not.toHaveProperty("notes")
    expect(row).not.toHaveProperty("timeline")
    expect(Object.keys(row).length).toBeLessThanOrEqual(14)
  }, CASE_TIMEOUT_MS)
})
