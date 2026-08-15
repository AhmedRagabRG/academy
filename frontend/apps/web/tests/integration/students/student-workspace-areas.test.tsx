import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { StudentEnrollmentsSection } from "@/features/students/components/student-enrollments-section"
import { StudentFinancialSummary } from "@/features/students/components/student-financial-summary"
import { StudentPersonalSection } from "@/features/students/components/student-personal-section"
import { StudentDetailList } from "@/features/students/components/student-detail-list"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import { mockBranch, mockEmployee, mockRole } from "@/features/auth/data/auth-fixtures"
import type { StudentEnrollment, StudentIdentity } from "@/features/students/types/domain"
import type { PermissionKey } from "@/shared/types/foundation"

function signIn(permissions: string[] = mockRole.permissionKeys) {
  useEmployeeContextStore.setState({
    context: {
      employee: mockEmployee,
      role: { ...mockRole, permissionKeys: permissions as PermissionKey[] },
      branch: mockBranch,
      organizationId: "organization-alsalam",
      organizationWide: true,
      authenticatedAt: "2026-07-31T00:00:00.000Z",
    },
  })
}

const programEnrollment = {
  id: "enrollment-program",
  offeringKind: "professional-program",
  offeringLabel: "برنامج تطوير الويب الاحترافي",
  offeringCode: "PRG-FS",
  batchId: "batch-fs-2026-a",
  batchLabel: "دفعة تطوير الويب - يناير ٢٠٢٦",
  batchCode: "FS-26A",
  enrollmentDate: "2026-01-12T09:00:00.000Z",
  status: "active",
} as StudentEnrollment

const courseEnrollment = {
  id: "enrollment-course",
  offeringKind: "training-course",
  offeringLabel: "دورة اللغة الإنجليزية",
  offeringCode: "CRS-EN",
  enrollmentDate: "2026-02-12T09:00:00.000Z",
  status: "completed",
} as StudentEnrollment

beforeEach(() => signIn())
afterEach(() => {
  cleanup()
  useEmployeeContextStore.setState({ context: null })
})

describe("enrollments area", () => {
  it("shows a batch for a program and none for a course", () => {
    render(
      <StudentEnrollmentsSection
        enrollments={[programEnrollment, courseEnrollment]}
        loading={false}
      />
    )

    expect(screen.getByText(/دفعة تطوير الويب/)).toBeInTheDocument()
    expect(screen.getByText("دورة اللغة الإنجليزية")).toBeInTheDocument()
    expect(screen.getAllByText(/المجموعة:/)).toHaveLength(1)
  })

  it("offers no create, edit, or remove affordance", () => {
    render(
      <StudentEnrollmentsSection
        enrollments={[programEnrollment]}
        loading={false}
      />
    )
    expect(screen.queryAllByRole("button")).toEqual([])
    expect(screen.queryByText(/إضافة تسجيل/)).not.toBeInTheDocument()
    expect(screen.queryByText(/حذف/)).not.toBeInTheDocument()
  })

  it("shows an empty state rather than an error for no enrollments", () => {
    render(<StudentEnrollmentsSection enrollments={[]} loading={false} />)
    expect(screen.getByText("لا توجد تسجيلات أكاديمية")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows a retryable error when the area read fails", () => {
    render(
      <StudentEnrollmentsSection
        enrollments={[]}
        loading={false}
        error={new Error("تعذر الاتصال")}
        onRetry={() => undefined}
      />
    )
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "إعادة المحاولة" })
    ).toBeEnabled()
  })

  it("withholds the area as forbidden when the permission is missing", () => {
    signIn(["students.view"])
    render(
      <StudentEnrollmentsSection
        enrollments={[programEnrollment]}
        loading={false}
      />
    )
    expect(
      screen.getByText("لا تملك صلاحية الوصول إلى هذا القسم.")
    ).toBeInTheDocument()
    expect(screen.queryByText(/برنامج تطوير الويب/)).not.toBeInTheDocument()
  })
})

describe("financial summary area", () => {
  it("renders read-only figures when available", () => {
    render(
      <StudentFinancialSummary
        loading={false}
        result={{
          state: "available",
          summary: {
            totalFees: { amount: "18000.00", currency: "EGP", precision: 2 },
            paidAmount: { amount: "6000.00", currency: "EGP", precision: 2 },
            remainingBalance: {
              amount: "12000.00",
              currency: "EGP",
              precision: 2,
            },
            activeInstallments: 3,
            asOf: "2026-07-31T00:00:00.000Z",
          },
        }}
      />
    )

    expect(screen.getByText("إجمالي الرسوم")).toBeInTheDocument()
    expect(screen.getByText("الأقساط النشطة")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("offers no financial action of any kind", () => {
    render(
      <StudentFinancialSummary
        loading={false}
        result={{ state: "unavailable", reason: "finance-module-absent" }}
      />
    )
    for (const label of ["سداد", "دفع", "استرداد", "قسط جديد", "تعديل"])
      expect(screen.queryByText(new RegExp(label))).not.toBeInTheDocument()
  })

  it("states why data is missing instead of showing zeroes", () => {
    render(
      <StudentFinancialSummary
        loading={false}
        result={{ state: "unavailable", reason: "finance-module-absent" }}
      />
    )
    expect(
      screen.getByText(/وحدة الشؤون المالية للطلاب غير متاحة بعد/)
    ).toBeInTheDocument()
    expect(screen.queryByText("0.00")).not.toBeInTheDocument()
  })

  it("distinguishes a source error from an absent module", () => {
    render(
      <StudentFinancialSummary
        loading={false}
        result={{ state: "unavailable", reason: "source-error" }}
      />
    )
    expect(
      screen.getByText("تعذر تحميل الملخص المالي من المصدر.")
    ).toBeInTheDocument()
  })

  it("withholds the area as forbidden without permission", () => {
    render(<StudentFinancialSummary loading={false} result={{ state: "forbidden" }} />)
    expect(
      screen.getByText("لا تملك صلاحية الوصول إلى هذا القسم.")
    ).toBeInTheDocument()
  })
})

describe("personal information area", () => {
  const identity = {
    fullName: "يوسف عبد الرحمن",
    primaryPhone: "01012345678",
    nationalId: "30304120101234",
    address: "القاهرة",
    dateOfBirth: "2003-04-12",
    qualificationLabel: "الثانوية العامة",
    graduationYear: 2021,
  } as StudentIdentity

  it("renders labelled values as a description list", () => {
    render(<StudentPersonalSection identity={identity} />)
    expect(screen.getByText("الاسم الكامل")).toBeInTheDocument()
    expect(screen.getByText("يوسف عبد الرحمن")).toBeInTheDocument()
    expect(screen.getByText("الرقم القومي")).toBeInTheDocument()
  })

  it("shows the alternative identity reason when no national identifier exists", () => {
    render(
      <StudentPersonalSection
        identity={{
          ...identity,
          nationalId: undefined,
          alternativeIdentityReason: "الرقم القومي قيد الاستخراج",
        }}
      />
    )
    expect(screen.getByText("سبب عدم وجود رقم قومي")).toBeInTheDocument()
    expect(screen.getByText("الرقم القومي قيد الاستخراج")).toBeInTheDocument()
    expect(screen.queryByText("الرقم القومي")).not.toBeInTheDocument()
  })

  it("renders an em dash for absent optional values", () => {
    render(
      <StudentDetailList entries={[{ label: "قيمة غائبة", value: undefined }]} />
    )
    expect(screen.getByText("—")).toBeInTheDocument()
  })
})
