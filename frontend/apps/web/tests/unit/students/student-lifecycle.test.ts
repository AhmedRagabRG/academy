import { describe, expect, it } from "vitest"
import {
  allowedTransitions,
  availableStatusActions,
  evaluateTransition,
  isReadOnlyStatus,
  isTransitionAllowed,
  studentTransitionPolicy,
  transitionRule,
} from "@/features/students/utils/student-lifecycle"
import { allStudentsPermissions } from "@/features/students/config/students-permissions"
import type { StudentStatus } from "@/features/students/types/common"

const ALL: StudentStatus[] = [
  "active",
  "suspended",
  "graduated",
  "withdrawn",
  "archived",
]

describe("transition table", () => {
  it("covers every status as a starting point", () => {
    for (const status of ALL)
      expect(studentTransitionPolicy[status]).toBeDefined()
  })

  it("allows exactly the documented transitions from active", () => {
    expect(allowedTransitions("active").sort()).toEqual([
      "archived",
      "graduated",
      "suspended",
      "withdrawn",
    ])
  })

  it("allows exactly the documented transitions from suspended", () => {
    expect(allowedTransitions("suspended").sort()).toEqual([
      "active",
      "archived",
      "withdrawn",
    ])
  })

  it("lets archived return only to active", () => {
    expect(allowedTransitions("archived")).toEqual(["active"])
  })

  it("lets terminal statuses archive or be corrected back to active", () => {
    expect(allowedTransitions("graduated").sort()).toEqual([
      "active",
      "archived",
    ])
    expect(allowedTransitions("withdrawn").sort()).toEqual([
      "active",
      "archived",
    ])
  })

  it("forbids lifecycle shortcuts", () => {
    expect(isTransitionAllowed("archived", "graduated")).toBe(false)
    expect(isTransitionAllowed("graduated", "suspended")).toBe(false)
    expect(isTransitionAllowed("withdrawn", "graduated")).toBe(false)
    expect(isTransitionAllowed("archived", "withdrawn")).toBe(false)
  })

  it("forbids a status transitioning to itself", () => {
    for (const status of ALL)
      expect(isTransitionAllowed(status, status)).toBe(false)
  })

  it("maps each transition to its exact permission", () => {
    expect(transitionRule("active", "suspended")?.permission).toBe(
      "students.status.manage"
    )
    expect(transitionRule("active", "archived")?.permission).toBe(
      "students.archive"
    )
    expect(transitionRule("archived", "active")?.permission).toBe(
      "students.activate"
    )
    expect(transitionRule("graduated", "active")?.permission).toBe(
      "students.status.correct"
    )
  })

  it("marks returns from a terminal status as corrections", () => {
    expect(transitionRule("graduated", "active")?.correction).toBe(true)
    expect(transitionRule("withdrawn", "active")?.correction).toBe(true)
    expect(transitionRule("archived", "active")?.correction).toBeUndefined()
  })

  it("requires a reason where the policy demands one", () => {
    expect(transitionRule("active", "suspended")?.reasonRequired).toBe(true)
    expect(transitionRule("active", "withdrawn")?.reasonRequired).toBe(true)
    expect(transitionRule("active", "archived")?.reasonRequired).toBe(true)
    expect(transitionRule("active", "graduated")?.reasonRequired).toBe(false)
    expect(transitionRule("archived", "active")?.reasonRequired).toBe(false)
  })
})

describe("transition evaluation", () => {
  const permissions = allStudentsPermissions as readonly string[]

  it("accepts a permitted transition with its required reason", () => {
    expect(
      evaluateTransition({
        from: "active",
        to: "suspended",
        reason: "طلب الطالب",
        permissions,
      }).ok
    ).toBe(true)
  })

  it("refuses a disallowed transition and reports what is allowed", () => {
    const result = evaluateTransition({
      from: "archived",
      to: "graduated",
      permissions,
    })
    expect(result).toMatchObject({ ok: false, code: "invalid-status-transition" })
    if (!result.ok) expect(result.allowed).toEqual(["active"])
  })

  it("refuses when the exact permission is missing", () => {
    expect(
      evaluateTransition({
        from: "active",
        to: "archived",
        reason: "سبب",
        permissions: ["students.status.manage"],
      })
    ).toMatchObject({ ok: false, code: "forbidden" })
  })

  it("refuses a missing or whitespace-only required reason", () => {
    expect(
      evaluateTransition({ from: "active", to: "suspended", permissions })
    ).toMatchObject({ ok: false, code: "reason-required" })
    expect(
      evaluateTransition({
        from: "active",
        to: "suspended",
        reason: "   ",
        permissions,
      })
    ).toMatchObject({ ok: false, code: "reason-required" })
  })

  it("accepts an optional reason being absent", () => {
    expect(
      evaluateTransition({ from: "active", to: "graduated", permissions }).ok
    ).toBe(true)
  })
})

describe("available actions projection", () => {
  it("returns only transitions this employee may perform", () => {
    expect(
      availableStatusActions("active", ["students.status.manage"]).sort()
    ).toEqual(["graduated", "suspended", "withdrawn"])
  })

  it("returns nothing without any lifecycle permission", () => {
    expect(availableStatusActions("active", ["students.view"])).toEqual([])
  })

  it("offers activation of an archived student only with students.activate", () => {
    expect(availableStatusActions("archived", ["students.activate"])).toEqual([
      "active",
    ])
    expect(availableStatusActions("archived", ["students.archive"])).toEqual([])
  })
})

describe("archived read-only rule", () => {
  it("treats only archived as read-only", () => {
    expect(isReadOnlyStatus("archived")).toBe(true)
    for (const status of ALL.filter((item) => item !== "archived"))
      expect(isReadOnlyStatus(status)).toBe(false)
  })
})
