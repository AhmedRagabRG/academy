import { describe, expect, it } from "vitest"
import {
  toBatchBody,
  toBatchDetail,
  toBatchSummary,
  toLookups,
  type ApiBatch,
  type ApiLookups,
} from "@/features/program-batches/services/program-batch-mapper"
import type { BatchInput } from "@/features/program-batches/types/commands"

const money = (amount: string) => ({ amount, currency: "EGP", precision: 2 })
const DEFAULTS = { currency: "EGP", precision: 2 }

const row: ApiBatch = {
  id: "batch-1",
  programId: "program-1",
  program: { id: "program-1", label: "برنامج" },
  name: { ar: "دفعة", en: "Batch" },
  code: "B-1",
  academicYearId: "year-1",
  academicYear: { id: "year-1", label: "العام" },
  intakeId: "intake-1",
  intake: { id: "intake-1", label: "قبول الخريف" },
  description: "وصف",
  schedule: {
    registrationStartDate: "2026-08-01",
    registrationEndDate: "2026-08-20",
    studyStartDate: "2026-09-01",
    studyEndDate: null,
    graduationDate: null,
  },
  capacity: {
    maximumStudents: 30,
    currentStudents: 28,
    availableSeats: 2,
    status: "nearly-full",
  },
  branchAssignments: [
    { branchId: "branch-1", role: "registration" },
    { branchId: "branch-1", role: "study" },
  ],
  financialProfile: {
    id: "revision-1",
    revisionNumber: 2,
    programPrice: money("5000.00"),
    registrationFee: money("250.00"),
    installmentsEnabled: true,
    installmentPlans: [
      {
        id: "plan-1",
        name: "خطة",
        basis: "percentage",
        coveredCharge: "program-price",
        status: "active",
        position: 1,
        installments: [
          { id: "i-2", label: "ثانية", value: "50", milestone: "study-start", position: 2 },
          { id: "i-1", label: "أولى", value: "50", milestone: "registration-start", position: 1 },
        ],
      },
    ],
    offers: [
      {
        id: "offer-1",
        kind: "discount",
        name: "خصم",
        valueType: "percentage",
        value: "10",
        precision: 2,
        currency: null,
        startDate: "2026-08-01",
        endDate: "2026-08-10",
        status: "active",
        position: 1,
      },
    ],
    sourceBatchVersion: 3,
    createdAt: "2026-08-01T00:00:00.000Z",
    createdBy: "actor-1",
  },
  status: "registration-open",
  lifecycle: [
    {
      id: "event-1",
      fromStatus: "draft",
      toStatus: "registration-open",
      reason: null,
      actorId: "actor-1",
      occurredAt: "2026-08-01T00:00:00.000Z",
      resultVersion: 2,
    },
  ],
  codeLockedAt: "2026-08-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  createdBy: "actor-1",
  updatedBy: "actor-2",
  version: 3,
}

/**
 * The renames between the API and the UI.
 *
 * Each of these is a field the two sides spell differently. A regression here
 * is silent — the value simply reads as empty or reverts to a default — so the
 * mapping is asserted directly rather than only through a screen.
 */
describe("reading a batch", () => {
  const detail = toBatchDetail(row, DEFAULTS)

  it("renames the capacity status to a state", () =>
    expect(detail.capacity.state).toBe("nearly-full"))

  it("renames an installment milestone to milestoneId", () =>
    expect(
      detail.financialProfile.installmentPlans[0]!.installments.map((i) => i.milestoneId)
    ).toEqual(["registration-start", "study-start"]))

  it("orders installments by position rather than payload order", () =>
    expect(
      detail.financialProfile.installmentPlans[0]!.installments.map((i) => i.label)
    ).toEqual(["أولى", "ثانية"]))

  it("renames offer dates to the validity window", () => {
    const offer = detail.financialProfile.offers[0]!
    expect(offer.validFrom).toBe("2026-08-01")
    expect(offer.validTo).toBe("2026-08-10")
  })

  it("keeps the revision id the consumers pin to", () =>
    expect(detail.financialProfile.currentRevisionId).toBe("revision-1"))

  it("derives codeLocked from the lock timestamp", () =>
    expect(detail.codeLocked).toBe(true))

  it("resolves the reference labels the detail header shows", () => {
    expect(detail.programName).toBe("برنامج")
    expect(detail.academicYearName).toBe("العام")
    expect(detail.intakeName).toBe("قبول الخريف")
  })

  it("marks returned branch assignments as active", () =>
    expect(detail.branchAssignments.every((a) => a.status === "active")).toBe(true))

  it("leaves revisions to their own read rather than inventing a history", () =>
    expect(detail.financialRevisions).toEqual([]))
})

describe("summarising a batch", () => {
  const summary = toBatchSummary(row, DEFAULTS)

  it("takes the price from the current revision", () =>
    expect(summary.price.amount).toBe("5000.00"))

  it("counts distinct branches, not assignments", () =>
    // The same branch fills both the registration and study roles.
    expect(summary.branchCount).toBe(1))

  it("falls back to a zero price when no revision exists", () =>
    expect(
      toBatchSummary({ ...row, financialProfile: null }, DEFAULTS).price
    ).toEqual({ amount: "0", currency: "EGP", precision: 2 }))
})

describe("writing a batch", () => {
  const input: BatchInput = {
    name: { ar: "دفعة" },
    code: "B-2",
    academicYearId: "year-1",
    intakeId: "intake-1",
    description: "وصف",
    maximumStudents: 20,
    schedule: { registrationStartDate: "2026-08-01" },
    financialProfile: {
      programPrice: money("1000.00"),
      registrationFee: money("100.00"),
      installmentsEnabled: true,
      installmentPlans: [
        {
          id: "plan-1",
          name: "خطة",
          basis: "percentage",
          coveredCharge: "program-price",
          status: "active",
          installments: [
            { id: "i-1", label: "أولى", value: "100", milestoneId: "study-start", position: 1 },
          ],
        },
      ],
      offers: [
        {
          id: "offer-1",
          kind: "discount",
          name: "خصم",
          valueType: "amount",
          value: "50",
          validFrom: "2026-08-01",
          status: "active",
        },
      ],
      currentRevisionId: "revision-1" as never,
    },
    branchAssignments: [
      { branchId: "branch-1", role: "registration", status: "active" },
    ],
  }
  const body = toBatchBody(input) as Record<string, never>

  it("renames milestoneId back to the milestone the API expects", () =>
    expect(
      (body.financialProfile as never as { installmentPlans: Array<{ installments: Array<{ milestone: string }> }> })
        .installmentPlans[0]!.installments[0]!.milestone
    ).toBe("study-start"))

  it("supplies the positions the API requires from array order", () => {
    const profile = body.financialProfile as never as {
      installmentPlans: Array<{ position: number }>
      offers: Array<{ position: number }>
    }
    expect(profile.installmentPlans[0]!.position).toBe(1)
    expect(profile.offers[0]!.position).toBe(1)
  })

  it("denominates an amount offer with the profile's currency and precision", () => {
    const offer = (body.financialProfile as never as {
      offers: Array<{ currency?: string; precision: number; startDate?: string }>
    }).offers[0]!
    expect(offer.currency).toBe("EGP")
    expect(offer.precision).toBe(2)
    expect(offer.startDate).toBe("2026-08-01")
  })

  it("omits schedule dates that were left blank", () =>
    expect(body.schedule).toEqual({ registrationStartDate: "2026-08-01" }))

  it("sends only the branch id and role, not the UI's assignment status", () =>
    expect(body.branchAssignments).toEqual([
      { branchId: "branch-1", role: "registration" },
    ]))

  it("does not send the revision id back as if it were writable", () =>
    expect(body.financialProfile).not.toHaveProperty("currentRevisionId"))
})

describe("batch lookups", () => {
  const lookups = toLookups({
    program: { id: "program-1", code: "P", label: "برنامج", active: true, batchingEligible: true },
    academicYears: [{ id: "year-1", label: "العام" }],
    intakes: [{ id: "intake-1", label: "قبول" }],
    branches: [
      { id: "branch-1", label: "فرع", active: true },
      { id: "branch-2", label: "فرع مؤرشف", active: false },
    ],
    scheduleMilestones: ["study-start", "graduation"],
    financialDefaults: { currency: "EGP", precision: 2 },
  } satisfies ApiLookups)

  it("reshapes options into the value/label pairs the selects use", () =>
    expect(lookups.intakes).toEqual([{ value: "intake-1", label: "قبول" }]))

  it("turns branch activity into the status the form filters on", () =>
    expect(lookups.branches.map((b) => b.status)).toEqual(["active", "inactive"]))

  it("gives milestones readable labels", () =>
    expect(lookups.milestones).toEqual([
      { value: "study-start", label: "بداية الدراسة" },
      { value: "graduation", label: "التخرج" },
    ]))

  it("takes currency and precision from the financial defaults", () => {
    expect(lookups.currency).toBe("EGP")
    expect(lookups.precision).toBe(2)
  })
})
