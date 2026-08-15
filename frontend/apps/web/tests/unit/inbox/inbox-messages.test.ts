import { describe, expect, it } from "vitest"
import { replySchema } from "@/features/inbox/schemas/inbox-schemas"

describe("Inbox message validation", () => {
  it("accepts attachment-only replies and rejects truly empty replies", () => {
    expect(
      replySchema.safeParse({ body: "", attachmentCount: 1 }).success
    ).toBe(true)
    expect(
      replySchema.safeParse({ body: "", attachmentCount: 0 }).success
    ).toBe(false)
  })
})
