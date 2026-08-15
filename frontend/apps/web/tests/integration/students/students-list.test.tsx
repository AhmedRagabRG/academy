import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import { studentScenarios } from "@/features/students/services/mock-scenario-controller"
import { StudentsToolbar } from "@/features/students/components/students-toolbar"
import { StudentBulkOutcome } from "@/features/students/components/student-bulk-outcome"
import { StudentStatusBadge } from "@/features/students/components/student-status-badge"
import { defaultStudentListQuery } from "@/features/students/utils/student-list-query"
import type { StudentLookups } from "@/features/students/types/domain"
import type { StudentId } from "@/features/students/types/common"

let lookups: StudentLookups

beforeEach(async () => {
  resetStudentStore()
  lookups = await studentsService.lookups()
})
// Vitest runs without `globals`, so RTL's auto-cleanup is not registered here.
afterEach(() => {
  cleanup()
  studentScenarios.reset()
})

describe("students list controls", () => {
  it("renders every filter from service lookups, not hardcoded values", () => {
    render(
      <StudentsToolbar
        query={defaultStudentListQuery}
        lookups={lookups}
        onChange={() => undefined}
        onClear={() => undefined}
        onExport={() => undefined}
      />
    )

    expect(screen.getByLabelText("فرع التسجيل")).toBeInTheDocument()
    expect(screen.getByLabelText("القسم")).toBeInTheDocument()
    expect(screen.getByLabelText("المنتج الأكاديمي")).toBeInTheDocument()
    expect(screen.getByLabelText("المجموعة")).toBeInTheDocument()
    expect(screen.getByLabelText("الحالة")).toBeInTheDocument()
    expect(screen.getByLabelText("موظف خدمة العملاء")).toBeInTheDocument()
  })

  it("offers a clear-filters affordance only when filters are active", () => {
    const { rerender } = render(
      <StudentsToolbar
        query={defaultStudentListQuery}
        lookups={lookups}
        onChange={() => undefined}
        onClear={() => undefined}
        onExport={() => undefined}
      />
    )
    expect(
      screen.queryByRole("button", { name: /مسح عوامل التصفية/ })
    ).not.toBeInTheDocument()

    rerender(
      <StudentsToolbar
        query={{ ...defaultStudentListQuery, statuses: ["archived"] }}
        lookups={lookups}
        onChange={() => undefined}
        onClear={() => undefined}
        onExport={() => undefined}
      />
    )
    expect(
      screen.getByRole("button", { name: /مسح عوامل التصفية/ })
    ).toBeInTheDocument()
  })

  it("encodes status with text, never colour alone", () => {
    render(<StudentStatusBadge status="suspended" />)
    expect(screen.getByText("موقوف")).toBeInTheDocument()
  })
})

describe("bulk outcome reporting", () => {
  it("lists refused records individually instead of hiding partial failure", () => {
    render(
      <StudentBulkOutcome
        outcomes={[
          {
            studentId: "student-1" as StudentId,
            studentCode: "STD-2026-00001",
            outcome: "applied",
          },
          {
            studentId: "student-2" as StudentId,
            studentCode: "STD-2026-00006",
            outcome: "refused",
            refusalCode: "invalid-status-transition",
            message: "هذا التغيير في الحالة غير مسموح به",
          },
        ]}
      />
    )

    expect(screen.getByText(/تم التنفيذ: 1/)).toBeInTheDocument()
    expect(screen.getByText(/تعذر التنفيذ: 1/)).toBeInTheDocument()
    expect(screen.getByText("STD-2026-00006")).toBeInTheDocument()
    expect(
      screen.getByText(/هذا التغيير في الحالة غير مسموح به/)
    ).toBeInTheDocument()
  })

  it("renders nothing when there are no outcomes", () => {
    const { container } = render(<StudentBulkOutcome outcomes={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe("list read states", () => {
  it("surfaces a retryable failure rather than an empty list", async () => {
    studentScenarios.failNext("list")
    await expect(
      studentsService.list(defaultStudentListQuery)
    ).rejects.toMatchObject({ code: "service-unavailable", retryable: true })
  })

  it("returns a genuine empty result when nothing matches", async () => {
    const page = await studentsService.list({
      ...defaultStudentListQuery,
      search: "اسم-غير-موجود",
    })
    expect(page.items).toEqual([])
    expect(page.total).toBe(0)
  })

  it("preserves remaining filters when a page becomes invalid", async () => {
    const page = await studentsService.list({
      page: 12,
      pageSize: 3,
      statuses: ["active"],
    })
    expect(page.page).toBeLessThanOrEqual(page.totalPages)
    for (const item of page.items) expect(item.status).toBe("active")
  })
})
