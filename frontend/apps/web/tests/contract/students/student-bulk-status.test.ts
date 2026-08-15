import { beforeEach, describe, expect, it } from "vitest"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import type { StudentSummary } from "@/features/students/types/projections"

async function rows(): Promise<StudentSummary[]> {
  const page = await studentsService.list({ page: 1, pageSize: 50 })
  return page.items
}

const byCode = (items: StudentSummary[], code: string) =>
  items.find((item) => item.studentCode === code)!

describe("bulk status change", () => {
  beforeEach(() => resetStudentStore())

  it("evaluates each student independently and reports both outcomes", async () => {
    const items = await rows()
    const active = byCode(items, "STD-2026-00001")
    const alreadyArchived = byCode(items, "STD-2026-00006")

    const outcomes = await studentsService.bulkChangeStatus({
      items: [
        {
          studentId: active.id,
          toStatus: "archived",
          reason: "أرشفة جماعية",
          expectedVersion: active.version,
        },
        {
          studentId: alreadyArchived.id,
          toStatus: "archived",
          reason: "أرشفة جماعية",
          expectedVersion: alreadyArchived.version,
        },
      ],
    })

    expect(outcomes).toHaveLength(2)
    expect(outcomes[0]).toMatchObject({ outcome: "applied" })
    expect(outcomes[1]).toMatchObject({
      outcome: "refused",
      refusalCode: "invalid-status-transition",
    })
  })

  it("never collapses a partial failure into one aggregate result", async () => {
    const items = await rows()
    const outcomes = await studentsService.bulkChangeStatus({
      items: items.slice(0, 4).map((item) => ({
        studentId: item.id,
        toStatus: "archived" as const,
        reason: "أرشفة جماعية",
        expectedVersion: item.version,
      })),
    })

    expect(outcomes).toHaveLength(4)
    for (const outcome of outcomes) {
      expect(outcome.studentCode).toBeTruthy()
      expect(["applied", "refused"]).toContain(outcome.outcome)
      if (outcome.outcome === "refused") expect(outcome.message).toBeTruthy()
    }
  })

  it("applies the successful records even when others are refused", async () => {
    const items = await rows()
    const active = byCode(items, "STD-2026-00001")
    const archived = byCode(items, "STD-2026-00006")

    await studentsService.bulkChangeStatus({
      items: [
        {
          studentId: archived.id,
          toStatus: "archived",
          reason: "سبب",
          expectedVersion: archived.version,
        },
        {
          studentId: active.id,
          toStatus: "archived",
          reason: "سبب",
          expectedVersion: active.version,
        },
      ],
    })

    expect((await studentsService.get(active.id)).status).toBe("archived")
    expect((await studentsService.get(archived.id)).status).toBe("archived")
  })

  it("refuses a record with a stale version without affecting the rest", async () => {
    const items = await rows()
    const first = byCode(items, "STD-2026-00001")
    const second = byCode(items, "STD-2026-00002")

    const outcomes = await studentsService.bulkChangeStatus({
      items: [
        {
          studentId: first.id,
          toStatus: "archived",
          reason: "سبب",
          expectedVersion: first.version - 1,
        },
        {
          studentId: second.id,
          toStatus: "archived",
          reason: "سبب",
          expectedVersion: second.version,
        },
      ],
    })

    expect(outcomes[0]).toMatchObject({
      outcome: "refused",
      refusalCode: "version-conflict",
    })
    expect(outcomes[1]).toMatchObject({ outcome: "applied" })
  })

  it("returns an empty result set for an empty selection", async () => {
    expect(await studentsService.bulkChangeStatus({ items: [] })).toEqual([])
  })
})
