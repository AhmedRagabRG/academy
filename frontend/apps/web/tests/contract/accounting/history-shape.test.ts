import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"
import type { ExpenseRequestId } from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const DRAFT = "request-1" as ExpenseRequestId
const UNDER_REVIEW = "request-3" as ExpenseRequestId
const PAID = "request-7" as ExpenseRequestId

describe("every entry carries the full record of one transition", () => {
  it("names the action, both statuses, the actor, and the time", async () => {
    const current = await accountingService.getRequest(DRAFT)
    await accountingService.submitRequest({
      requestId: DRAFT,
      expectedVersion: current.version,
    })

    const entry = (await accountingService.listHistory(DRAFT)).at(-1)!
    expect(entry.action).toBe("submitted")
    expect(entry.fromStatus).toBe("draft")
    expect(entry.toStatus).toBe("submitted")
    expect(entry.performedBy.id).toBeTruthy()
    expect(entry.performedBy.name).toBeTruthy()
    expect(Number.isNaN(new Date(entry.occurredAt).getTime())).toBe(false)
    expect(entry.requestId).toBe(DRAFT)
  })

  it("carries the note on a negative outcome", async () => {
    const current = await accountingService.getRequest(UNDER_REVIEW)
    await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "rejected",
      note: "خارج الميزانية",
      expectedVersion: current.version,
    })
    expect((await accountingService.listHistory(UNDER_REVIEW)).at(-1)!.note).toBe(
      "خارج الميزانية"
    )
  })

  it("leaves the note absent rather than blank when there is none", async () => {
    const current = await accountingService.getRequest(UNDER_REVIEW)
    await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "approved",
      expectedVersion: current.version,
    })
    expect((await accountingService.listHistory(UNDER_REVIEW)).at(-1)!.note).toBeUndefined()
  })

  it("gives every entry a distinct id", async () => {
    const history = await accountingService.listHistory(PAID)
    expect(new Set(history.map((entry) => entry.id)).size).toBe(history.length)
  })

  it("gives every entry a distinct, increasing sequence", async () => {
    const history = await accountingService.listHistory(PAID)
    const sequences = history.map((entry) => entry.sequence)
    expect(new Set(sequences).size).toBe(sequences.length)
    for (let index = 1; index < sequences.length; index += 1)
      expect(sequences[index]!).toBeGreaterThan(sequences[index - 1]!)
  })
})

describe("fromStatus is null only for creation", () => {
  it("is null on the creating entry", async () => {
    const history = await accountingService.listHistory(DRAFT)
    expect(history[0]!.action).toBe("created")
    expect(history[0]!.fromStatus).toBeNull()
  })

  it("is never null on any later entry", async () => {
    const history = await accountingService.listHistory(PAID)
    for (const entry of history.slice(1))
      expect(entry.fromStatus, entry.action).not.toBeNull()
  })

  it("chains: each entry's fromStatus is the previous entry's toStatus", async () => {
    // A break in the chain would mean a transition happened without being recorded.
    const history = await accountingService.listHistory(PAID)
    for (let index = 1; index < history.length; index += 1)
      expect(history[index]!.fromStatus, history[index]!.action).toBe(
        history[index - 1]!.toStatus
      )
  })

  it("ends at the request's current status", async () => {
    const request = await accountingService.getRequest(PAID)
    const history = await accountingService.listHistory(PAID)
    expect(history.at(-1)!.toStatus).toBe(request.status)
  })
})

describe("history is ordered oldest first", () => {
  it("reads as a narrative from creation onwards", async () => {
    const history = await accountingService.listHistory(PAID)
    expect(history[0]!.action).toBe("created")
    const times = history.map((entry) => new Date(entry.occurredAt).getTime())
    for (let index = 1; index < times.length; index += 1)
      expect(times[index]!).toBeGreaterThanOrEqual(times[index - 1]!)
  })

  it("stays stable across repeated reads", async () => {
    const first = await accountingService.listHistory(PAID)
    const second = await accountingService.listHistory(PAID)
    expect(first.map((entry) => entry.id)).toEqual(second.map((entry) => entry.id))
  })
})

describe("reading history requires its own permission", () => {
  it("is refused without accounting.history.view", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.historyView])
    await expect(accountingService.listHistory(DRAFT)).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("is refused for a request outside the acting user's scope", async () => {
    accountingScenarios.scopeToBranches(["branch-giza"])
    // The seeded draft belongs to branch-cairo.
    await expect(accountingService.listHistory(DRAFT)).rejects.toMatchObject({
      code: "out-of-scope",
    })
  })
})
