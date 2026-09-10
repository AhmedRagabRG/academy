import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { isValidRange, WorkingHoursEditor } from "@/features/ai-agent/components/working-hours-editor"
import { DataCollectionEditor } from "@/features/ai-agent/components/data-collection-editor"
import { crmFieldCatalog, toolCatalog } from "@/features/ai-agent/config/ai-agent-permissions"

// This project does not enable Testing Library's auto-cleanup, so without this
// each render stacks in the DOM and queries start matching several elements.
afterEach(cleanup)

describe("working hours range validation", () => {
  it.each(["09:00-17:00", "00:00-23:59", "20:00-04:00"])("accepts %s", (value) => {
    expect(isValidRange(value)).toBe(true)
  })
  it.each(["9:00-17:00", "09:00", "25:00-26:00", "09:00–17:00", ""])(
    "rejects %s",
    (value) => {
      expect(isValidRange(value)).toBe(false)
    },
  )
})

describe("WorkingHoursEditor", () => {
  it("treats null as always-on and hides the per-day rows", () => {
    render(<WorkingHoursEditor value={null} disabled={false} onChange={vi.fn()} />)
    expect(screen.getByRole("checkbox", { name: /مدار الساعة/ })).toBeChecked()
    expect(screen.queryByLabelText(/ساعات/)).toBeNull()
  })

  it("switching off always-on seeds a day rather than leaving every day closed", async () => {
    const onChange = vi.fn()
    render(<WorkingHoursEditor value={null} disabled={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole("checkbox", { name: /مدار الساعة/ }))
    expect(onChange).toHaveBeenCalledWith({ sun: "09:00-17:00" })
  })

  it("flags a malformed range so the admin sees which day is wrong", () => {
    render(
      <WorkingHoursEditor
        value={{ sun: "9am-5pm" }}
        disabled={false}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/ساعات الأحد/)).toHaveAttribute(
      "aria-invalid",
      "true",
    )
  })
})

describe("DataCollectionEditor", () => {
  it("explains that no fields means no collection", () => {
    render(<DataCollectionEditor fields={[]} disabled={false} onChange={vi.fn()} />)
    expect(screen.getByText(/لن يحاول المساعد جمع/)).toBeInTheDocument()
  })

  it("refuses a duplicate key", async () => {
    render(
      <DataCollectionEditor
        fields={[{ key: "email", label: "البريد" }]}
        disabled={false}
        onChange={vi.fn()}
      />,
    )
    await userEvent.type(screen.getByLabelText("المفتاح"), "email")
    await userEvent.type(screen.getByLabelText("ما يُعرض للعميل"), "البريد")
    expect(screen.getByRole("button", { name: "إضافة حقل" })).toBeDisabled()
    expect(screen.getByText(/مستخدم بالفعل/)).toBeInTheDocument()
  })

  it("reorders without losing a field", async () => {
    const onChange = vi.fn()
    render(
      <DataCollectionEditor
        fields={[
          { key: "name", label: "الاسم" },
          { key: "email", label: "البريد" },
        ]}
        disabled={false}
        onChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /تحريك البريد لأعلى/ }))
    expect(onChange).toHaveBeenCalledWith([
      { key: "email", label: "البريد" },
      { key: "name", label: "الاسم" },
    ])
  })

  it("hides the editing controls when the user cannot manage", () => {
    render(
      <DataCollectionEditor
        fields={[{ key: "name", label: "الاسم" }]}
        disabled
        onChange={vi.fn()}
      />,
    )
    expect(screen.queryByRole("button", { name: "إضافة حقل" })).toBeNull()
    expect(screen.queryByRole("button", { name: "حذف" })).toBeNull()
  })
})

describe("catalogs match the backend contract", () => {
  it("offers exactly the seven agent tools", () => {
    expect(toolCatalog.map((tool) => tool.name)).toEqual([
      "kb_search",
      "crm_read_contact",
      "crm_update_contact",
      "crm_add_note",
      "record_collected_fields",
      "create_ticket",
      "handoff_to_human",
    ])
  })

  it("never offers phone as a writable CRM field", () => {
    // phone is the contact identity key; the backend rejects it regardless.
    expect(crmFieldCatalog.map((entry) => entry.name)).not.toContain("phone")
  })
})

/**
 * Regression: the channel checkboxes were wired to `platform.id`, so saving sent
 * UUIDs into `enabledPlatformCodes` and the API answered
 * "قناة غير معروفة: <uuid>". Both sides are plain `string[]`, so nothing in the
 * type system catches it — hence this test.
 */
describe("channel selection uses codes, not row ids", () => {
  it("keeps id and code distinct in the lookups contract", async () => {
    const { platforms } = await import("@/features/inbox/data/inbox-lookups")
    for (const platform of platforms) {
      expect(platform.code).toBeTruthy()
      expect(platform.code).not.toBe(platform.id)
      // A code is a stable slug; a row id is a uuid-ish key.
      expect(platform.code).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it("covers the channels the agent can actually answer on", async () => {
    const { platforms } = await import("@/features/inbox/data/inbox-lookups")
    const codes = platforms.map((platform) => platform.code)
    expect(codes).toEqual(expect.arrayContaining(["whatsapp", "messenger", "instagram"]))
  })
})
