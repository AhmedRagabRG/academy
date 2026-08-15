import { beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import type { ExpenseRequestId } from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())

const PAID = "request-7" as ExpenseRequestId
const DRAFT = "request-1" as ExpenseRequestId

/**
 * SC-004. "History is immutable" as a sentence in a document is worth nothing;
 * the question is what makes violating it impossible. Three mechanisms, each
 * asserted here.
 */
describe("the service exposes no way to change history", () => {
  it("has no operation whose name suggests removal", () => {
    const names = Object.keys(accountingService)
    const removal = names.filter((name) =>
      /delete|destroy|purge|erase/i.test(name)
    )
    expect(removal).toEqual([])
  })

  it("has no history mutation operation at all", () => {
    const names = Object.keys(accountingService)
    const historyWriters = names.filter(
      (name) => /history/i.test(name) && !/^list/.test(name)
    )
    // `listHistory` is the only operation naming history.
    expect(historyWriters).toEqual([])
  })

  it("exposes removal only for attachments, which is itself status-guarded", () => {
    const names = Object.keys(accountingService)
    expect(names.filter((name) => /remove/i.test(name))).toEqual([
      "removeAttachment",
    ])
  })
})

/**
 * Every projection is deep-cloned, so a caller mutating what it received cannot
 * reach the store. Without this, "immutable" would hold only by convention.
 */
describe("a caller cannot reach the store through what it received", () => {
  it("ignores mutation of a returned history array", async () => {
    const history = await accountingService.listHistory(PAID)
    const originalLength = history.length

    history.push({ ...history[0]! })
    history.pop()
    history.splice(0, 1)

    const reread = await accountingService.listHistory(PAID)
    expect(reread).toHaveLength(originalLength)
  })

  it("ignores mutation of a returned entry's fields", async () => {
    const history = await accountingService.listHistory(PAID)
    const originalAction = history[0]!.action
    const originalActor = history[0]!.performedBy.name

    history[0]!.action = "approved"
    history[0]!.note = "تم التلاعب"
    history[0]!.performedBy.name = "شخص آخر"

    const reread = await accountingService.listHistory(PAID)
    expect(reread[0]!.action).toBe(originalAction)
    expect(reread[0]!.note).toBeUndefined()
    expect(reread[0]!.performedBy.name).toBe(originalActor)
  })

  it("ignores mutation of the history inside a request detail", async () => {
    const detail = await accountingService.getRequest(PAID)
    const originalLength = detail.history.length
    detail.history.splice(0, detail.history.length)

    const reread = await accountingService.getRequest(PAID)
    expect(reread.history).toHaveLength(originalLength)
  })

  it("returns a fresh array on every read, not a shared reference", async () => {
    const first = await accountingService.listHistory(PAID)
    const second = await accountingService.listHistory(PAID)
    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(second[0])
  })
})

describe("history only ever grows", () => {
  it("never loses an entry across a request's whole lifecycle", async () => {
    const lengths: number[] = []
    const record = async () =>
      lengths.push((await accountingService.listHistory(DRAFT)).length)

    await record()
    let current = await accountingService.getRequest(DRAFT)
    current = await accountingService.submitRequest({
      requestId: DRAFT,
      expectedVersion: current.version,
    })
    await record()
    current = await accountingService.startReview({
      requestId: DRAFT,
      expectedVersion: current.version,
    })
    await record()
    await accountingService.decideRequest({
      requestId: DRAFT,
      decision: "rejected",
      note: "سبب",
      expectedVersion: current.version,
    })
    await record()

    for (let index = 1; index < lengths.length; index += 1)
      expect(lengths[index]!).toBeGreaterThan(lengths[index - 1]!)
  })

  it("keeps the creating entry unchanged for the whole lifecycle", async () => {
    const first = (await accountingService.listHistory(DRAFT))[0]!
    let current = await accountingService.getRequest(DRAFT)
    current = await accountingService.submitRequest({
      requestId: DRAFT,
      expectedVersion: current.version,
    })
    await accountingService.startReview({
      requestId: DRAFT,
      expectedVersion: current.version,
    })

    const stillFirst = (await accountingService.listHistory(DRAFT))[0]!
    expect(stillFirst.id).toBe(first.id)
    expect(stillFirst.action).toBe(first.action)
    expect(stillFirst.occurredAt).toBe(first.occurredAt)
    expect(stillFirst.performedBy.name).toBe(first.performedBy.name)
  })
})
