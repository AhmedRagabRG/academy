import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { StudentWorkspaceTabs } from "@/features/students/components/student-workspace-tabs"
import type { StudentAreaPermissions } from "@/features/students/types/projections"

const pathname = vi.hoisted(() => ({ current: "/students/student-1" }))

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}))

const allAreas: StudentAreaPermissions = {
  overview: true,
  enrollments: true,
  documents: true,
  documentsManage: true,
  notes: true,
  notesManage: true,
  timeline: true,
  financial: true,
  update: true,
  archive: true,
  activate: true,
  statusManage: true,
  statusCorrect: true,
  export: true,
}

afterEach(() => {
  cleanup()
  pathname.current = "/students/student-1"
})

describe("workspace tab navigation", () => {
  it("renders a navigation landmark with an accessible name", () => {
    render(
      <StudentWorkspaceTabs studentId="student-1" permissions={allAreas} />
    )
    expect(
      screen.getByRole("navigation", { name: "أقسام ملف الطالب" })
    ).toBeInTheDocument()
  })

  it("renders every area as a real link, so each is deep-linkable", () => {
    render(
      <StudentWorkspaceTabs studentId="student-1" permissions={allAreas} />
    )
    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/students/student-1",
      "/students/student-1/documents",
      "/students/student-1/notes",
      "/students/student-1/timeline",
    ])
  })

  it("keeps every tab in the tab order", () => {
    render(
      <StudentWorkspaceTabs studentId="student-1" permissions={allAreas} />
    )
    for (const link of screen.getAllByRole("link"))
      expect(link).not.toHaveAttribute("tabindex", "-1")
  })

  it("marks the active segment with aria-current", () => {
    pathname.current = "/students/student-1/documents"
    render(
      <StudentWorkspaceTabs studentId="student-1" permissions={allAreas} />
    )
    expect(
      screen.getByRole("link", { name: "المستندات" })
    ).toHaveAttribute("aria-current", "page")
    expect(
      screen.getByRole("link", { name: "نظرة عامة" })
    ).not.toHaveAttribute("aria-current")
  })

  it("matches the overview tab exactly, not by prefix", () => {
    pathname.current = "/students/student-1/timeline"
    render(
      <StudentWorkspaceTabs studentId="student-1" permissions={allAreas} />
    )
    expect(
      screen.getByRole("link", { name: "نظرة عامة" })
    ).not.toHaveAttribute("aria-current")
    expect(
      screen.getByRole("link", { name: "السجل الزمني" })
    ).toHaveAttribute("aria-current", "page")
  })

  it("hides forbidden areas rather than showing them as empty tabs", () => {
    render(
      <StudentWorkspaceTabs
        studentId="student-1"
        permissions={{ ...allAreas, notes: false, financial: false }}
      />
    )
    expect(
      screen.queryByRole("link", { name: "الملاحظات" })
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(3)
  })

  it("still renders the overview tab when every other area is forbidden", () => {
    render(
      <StudentWorkspaceTabs
        studentId="student-1"
        permissions={{
          ...allAreas,
          documents: false,
          notes: false,
          timeline: false,
        }}
      />
    )
    expect(screen.getAllByRole("link")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "نظرة عامة" })).toBeInTheDocument()
  })
})
