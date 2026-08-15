import { beforeEach, describe, expect, it } from "vitest"
import { useSidebarStore } from "@/shared/store/sidebar-store"

describe("sidebar store", () => {
  beforeEach(() => useSidebarStore.setState({ collapsed: false }))
  it("toggles through a focused action", () => {
    useSidebarStore.getState().toggle()
    expect(useSidebarStore.getState().collapsed).toBe(true)
  })
})
