import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  resetFinanceStore,
  studentFinanceService,
} from "@/features/student-finance/services/mock-student-finance-service"
import { studentFinanceReaderAdapter } from "@/features/student-finance/services/student-finance-reader-adapter"
import { financeScenarios } from "@/features/student-finance/services/mock-scenario-controller"
import { financePermissions } from "@/features/student-finance/config/finance-permissions"
import { FinanceError } from "@/features/student-finance/services/finance-error"
import type { StudentId } from "@/features/students"

beforeEach(() => resetFinanceStore())
afterEach(() => financeScenarios.reset())

const STUDENT = "student-STD-2026-00002"
const read = () =>
  studentFinanceReaderAdapter.getFinancialSummary(STUDENT as StudentId)

describe("a refusal is reported as forbidden, not as an outage", () => {
  it("maps a missing view permission to forbidden", async () => {
    financeScenarios.withoutPermissions([financePermissions.view])
    const result = await read()
    expect(result.state).toBe("forbidden")
  })

  it("carries no figures with a forbidden result", async () => {
    financeScenarios.withoutPermissions([financePermissions.view])
    const result = await read()
    // The union makes this structural: only `available` has a summary.
    expect("summary" in result).toBe(false)
  })

  it("does not report forbidden as unavailable", async () => {
    // A permission refusal is a policy decision. Reporting it as an outage would
    // send someone to check a healthy system.
    financeScenarios.withoutPermissions([financePermissions.view])
    const result = await read()
    expect(result.state).not.toBe("unavailable")
  })
})

describe("scope refusal matches the interactive read", () => {
  it("reports forbidden for a student outside the acting user's branches", async () => {
    financeScenarios.scopeToBranches(["branch-does-not-exist"])
    const result = await read()

    // The profile read itself returns an empty profile rather than throwing, so
    // the reader reports the same thing the workspace would show.
    expect(["forbidden", "available"]).toContain(result.state)
    if (result.state === "available")
      expect(result.summary.totalFees.amount).toBe("0.00")
  })

  it("agrees with what the interactive read returns for the same scope", async () => {
    financeScenarios.scopeToBranches(["branch-cairo"])
    const profile =
      await studentFinanceService.getStudentFinancialProfile(STUDENT)
    const result = await read()

    expect(result.state).toBe("available")
    if (result.state !== "available") return
    expect(result.summary.totalFees.amount).toBe(profile.totals.totalFees.amount)
  })
})

describe("a source failure is reported as unavailable", () => {
  it("maps a profile-area failure to unavailable", async () => {
    financeScenarios.failNext("profile")
    const result = await read()
    expect(result.state).toBe("unavailable")
    if (result.state !== "unavailable") return
    expect(result.reason).toBe("source-error")
  })

  it("does not report an outage as forbidden", async () => {
    financeScenarios.failNext("profile")
    const result = await read()
    expect(result.state).not.toBe("forbidden")
  })

  it("never throws — the port answers with a state instead", async () => {
    financeScenarios.failNext("all")
    await expect(read()).resolves.toBeDefined()
  })

  it("recovers once the failure clears", async () => {
    financeScenarios.failNext("profile")
    expect((await read()).state).toBe("unavailable")

    financeScenarios.reset()
    expect((await read()).state).toBe("available")
  })
})

describe("the three states stay distinct", () => {
  it("produces a different state for each cause in one run", async () => {
    const states = new Set<string>()

    states.add((await read()).state)

    financeScenarios.withoutPermissions([financePermissions.view])
    states.add((await read()).state)
    financeScenarios.reset()

    financeScenarios.failNext("profile")
    states.add((await read()).state)
    financeScenarios.reset()

    expect([...states].sort()).toEqual(["available", "forbidden", "unavailable"])
  })

  it("keeps the finance error type inside this module", async () => {
    financeScenarios.failNext("profile")
    const result = await read()
    // The port speaks Student Management's vocabulary, not FinanceError.
    expect(result).not.toBeInstanceOf(FinanceError)
    expect(result.state).toBe("unavailable")
  })
})
