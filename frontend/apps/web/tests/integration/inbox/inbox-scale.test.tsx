import { describe, expect, it } from "vitest"
// Scale generation itself is the unit under test; production UI never imports it.
// eslint-disable-next-line no-restricted-imports
import { createConversationScale } from "@/features/inbox/data/inbox-scale-fixtures"

describe("Inbox scale fixtures", () => {
  it("creates 500 stable unique conversation records", () => {
    const rows = createConversationScale()
    expect(rows).toHaveLength(500)
    expect(new Set(rows.map((row) => row.id)).size).toBe(500)
  })
})
