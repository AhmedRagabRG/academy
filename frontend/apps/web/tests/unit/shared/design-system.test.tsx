import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"

describe("shared states", () => {
  it("communicates empty and error states", () => {
    const { rerender } = render(<EmptyState />)
    expect(screen.getByText("لا توجد بيانات")).toBeInTheDocument()
    rerender(<ErrorState />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })
})
