import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AiPlaceholderPanel } from "@/features/inbox/components/ai-placeholder-panel"

describe("AI placeholders", () => {
  it("labels all future capabilities as unavailable without buttons", () => {
    render(<AiPlaceholderPanel />)
    expect(screen.getAllByText("قريبًا")).toHaveLength(6)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
