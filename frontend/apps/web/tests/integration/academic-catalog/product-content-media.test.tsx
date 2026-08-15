import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { OrderedContentList } from "@/features/academic-catalog/components/ordered-content-list"
describe("ordered catalog content", () => {
  it("offers keyboard-operable ordering and removal", () => {
    render(
      <OrderedContentList
        items={[{ id: "1", title: "سؤال", position: 0 }]}
        onChange={() => undefined}
      />
    )
    expect(screen.getByRole("button", { name: "تحريك لأعلى" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "إزالة" })).toBeEnabled()
  })
})
