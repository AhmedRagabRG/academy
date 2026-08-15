import { describe, expect, it } from "vitest"
import {
  availableActions,
  documentCounts,
  toAdmissionDetail,
  toAdmissionSummary,
  toDocument,
  toEnrollmentReadiness,
  toLookups,
  toReadiness,
  type ApiAdmissionDetail,
  type ApiAdmissionLookups,
  type ApiDocument,
} from "@/features/admissions/services/admissions-mapper"
import type { AdmissionId } from "@/features/admissions/types/common"

const DEFAULTS = { currency: "EGP", precision: 2 }

const detailRow: ApiAdmissionDetail = {
  id: "admission-1",
  reference: "ADM-001",
  applicantName: "مقدم",
  phoneHint: "*****0001",
  offeringLabel: "برنامج",
  batchLabel: "دفعة",
  registrationBranchLabel: "الفرع الرئيسي",
  status: "draft",
  version: 3,
  updatedAt: "2026-08-02T00:00:00.000Z",
  applicant: {
    id: "applicant-1",
    fullName: "مقدم",
    primaryPhone: "01000000001",
    guardianPhone: null,
    nationalId: "20000000000001",
    alternativeIdentityReason: null,
    address: "القاهرة",
    dateOfBirth: "2000-01-01",
    qualificationId: "qual-1",
    qualificationLabel: "بكالوريوس",
    graduationYear: 2020,
  },
  assignment: {
    registrationBranchId: "branch-1",
    registrationBranchLabel: "الفرع الرئيسي",
    studyBranchId: "branch-1",
    studyBranchLabel: "الفرع الرئيسي",
    admissionsEmployeeId: "emp-1",
    admissionsEmployeeName: "موظف",
    customerServiceEmployeeId: "emp-1",
    customerServiceEmployeeName: "موظف",
    customerServiceManagerId: "mgr-1",
    customerServiceManagerName: "مدير",
    departmentId: "dept-1",
    departmentLabel: "قسم",
    leadSourceId: "lead-1",
    leadSourceLabel: "الموقع",
    academicGradeId: null,
    academicGradeLabel: null,
  },
  selection: {
    id: "selection-1",
    revisionNumber: 1,
    offeringKind: "professional-program",
    offeringId: "offering-1",
    offeringVersion: 1,
    offeringLabel: "برنامج",
    offeringCode: "PRG-1",
    batchId: "batch-1",
    batchVersion: 1,
    batchLabel: "دفعة",
    batchCode: "B-1",
    batchFinancialRevisionId: "rev-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    createdBy: "actor-1",
  },
  requirementSnapshot: null,
  notes: "ملاحظة",
}

const emptyParts = {
  documents: [],
  readiness: toReadiness(
    { ready: false, findings: [] },
    { action: "submit" as const, status: "draft" as const, version: 3 },
    []
  ),
  lifecycle: [],
  financialHistory: [],
  defaults: DEFAULTS,
}

describe("reading an admission", () => {
  const detail = toAdmissionDetail(detailRow, emptyParts)

  it("keeps the applicant's resolved qualification label", () =>
    expect(detail.applicant.qualificationLabel).toBe("بكالوريوس"))

  it("defaults an absent applicant status to active", () =>
    expect(detail.applicant.status).toBe("active"))

  it("leaves eligibility absent rather than inventing an assessment", () =>
    // The API records no per-revision eligibility.
    expect(detail.selection?.eligibility).toBeUndefined())

  it("tolerates an absent requirement snapshot", () =>
    expect(detail.requirementSnapshot.requirements).toEqual([]))

  it("derives the applicant id from the nested applicant when absent", () =>
    expect(detail.applicantId).toBe("applicant-1"))

  it("keeps only the current selection as history", () =>
    expect(detail.selectionHistory).toHaveLength(1))
})

describe("summarising an admission", () => {
  const summary = toAdmissionSummary({
    ...detailRow,
    assignedEmployeeName: null,
    offeringCode: null,
  })

  it("renames the registration branch label", () =>
    expect(summary.registrationBranch).toBe("الفرع الرئيسي"))

  it("blanks fields the list route does not carry", () => {
    expect(summary.offeringCode).toBe("")
    expect(summary.assignedEmployee).toBe("")
  })
})

/**
 * The actions a status permits.
 *
 * Mirrors the server's transition table; the readiness route reports whether
 * one action would succeed but never which actions exist.
 */
describe("available actions", () => {
  it("offers submit and archive from draft", () =>
    expect(availableActions("draft")).toEqual(["submitted", "archived"]))

  it("offers the full review set from under-review", () =>
    expect(availableActions("under-review")).toEqual([
      "approved",
      "rejected",
      "draft",
      "archived",
    ]))

  it("offers nothing from a terminal status", () => {
    expect(availableActions("enrolled")).toEqual([])
    expect(availableActions("archived")).toEqual([])
  })
})

describe("readiness", () => {
  it("defaults a finding's severity to error", () => {
    const readiness = toReadiness(
      { ready: false, findings: [{ code: "x", section: "academic", message: "m" }] },
      { action: "submit", status: "draft", version: 2 },
      []
    )
    expect(readiness.findings[0]!.severity).toBe("error")
  })

  it("falls back to the caller's action and version when the API omits them", () => {
    const readiness = toReadiness(
      { ready: true },
      { action: "approve", status: "under-review", version: 7 },
      []
    )
    expect(readiness.action).toBe("approve")
    expect(readiness.admissionVersion).toBe(7)
  })
})

describe("document counts", () => {
  const make = (state: string, required = true): ApiDocument => ({
    id: `doc-${state}`,
    requirementId: `req-${state}`,
    requirementKey: state,
    requirement: { id: `req-${state}`, key: state, required },
    state,
  })

  it("tallies each state the panel reports", () => {
    const documents = [
      make("verified"),
      make("pending"),
      make("rejected"),
      make("missing"),
      make("withdrawn"),
    ].map(toDocument)
    expect(documentCounts(documents)).toEqual({
      required: 5,
      // A withdrawn document leaves the requirement unmet.
      missing: 2,
      pending: 1,
      rejected: 1,
      verified: 1,
    })
  })
})

describe("reading a document", () => {
  it("falls back to the requirement key when no label is given", () => {
    const document = toDocument({
      id: "doc-1",
      requirementId: "req-1",
      requirementKey: "national-id",
      state: "pending",
    })
    expect(document.requirement.label).toBe("national-id")
  })

  it("accepts either spelling of the size and name fields", () => {
    const document = toDocument({
      id: "doc-1",
      requirementId: "req-1",
      state: "pending",
      currentVersion: {
        id: "version-1",
        versionNumber: 1,
        originalName: "id.pdf",
        byteSize: 2048,
        mimeType: "application/pdf",
        decidedAt: undefined as never,
      } as never,
    })
    expect(document.currentVersion?.fileName).toBe("id.pdf")
    expect(document.currentVersion?.size).toBe(2048)
    expect(document.versions).toHaveLength(1)
  })

  it("treats an unknown state as missing", () =>
    expect(
      toDocument({ id: "d", requirementId: "r", state: "who-knows" }).state
    ).toBe("missing"))
})

describe("enrollment readiness", () => {
  it("flattens structured findings into reason codes", () => {
    const summary = toEnrollmentReadiness(
      {
        ready: false,
        findings: [
          { code: "invalid-status", section: "workflow", message: "m" },
          { code: "approval-snapshot-missing", section: "workflow", message: "m" },
        ],
      },
      {
        id: "admission-1" as AdmissionId,
        reference: "ADM-001",
        status: "draft",
        version: 3,
      }
    )
    expect(summary.reasons).toEqual([
      "invalid-status",
      "approval-snapshot-missing",
    ])
    expect(summary.admissionReference).toBe("ADM-001")
  })
})

describe("admissions lookups", () => {
  const lookups = toLookups({
    branches: [{ value: "b1", label: "فرع", status: "active" }],
    employees: [{ value: "e1", label: "موظف" }],
    managers: [{ value: "m1", label: "مدير" }],
    departments: [{ value: "d1", label: "قسم" }],
    leadSources: [{ value: "l1", label: "مصدر" }],
    academicGrades: [{ value: "g1", label: "جيد" }],
    qualifications: [{ value: "q1", label: "بكالوريوس" }],
    offerings: [
      {
        id: "o1",
        label: "برنامج",
        code: "PRG",
        kind: "professional-program",
        status: "active",
        version: 2,
        price: { amount: "1000.00", currency: "EGP", precision: 2 },
      },
    ],
    batches: [],
    documentPolicy: { id: "admissions-standard", policyVersion: 1 },
    currency: "EGP",
    precision: 2,
  } satisfies ApiAdmissionLookups)

  it("defaults an option with no status to active", () =>
    expect(lookups.employees[0]!.status).toBe("active"))

  it("carries the offering's Arabic label as its name", () =>
    expect(lookups.offerings[0]!.name.ar).toBe("برنامج"))

  it("supplies a zero price when an offering has none", () =>
    expect(lookups.offerings[0]!.registrationFees).toEqual({
      amount: "0",
      currency: "EGP",
      precision: 2,
    }))

  it("carries the document policy identity", () => {
    expect(lookups.documentPolicy.policyId).toBe("admissions-standard")
    expect(lookups.documentPolicy.policyVersion).toBe(1)
  })
})
