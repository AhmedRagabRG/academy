import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { GeneralSettingsForm } from "@/features/organization-settings/forms/general-settings-form"
// eslint-disable-next-line no-restricted-imports
import { generalSettings } from "@/features/organization-settings/data/organization-fixtures"
// eslint-disable-next-line no-restricted-imports
import { lookups } from "@/features/organization-settings/data/organization-settings-fixtures"

describe("general settings form", () => {
  it("has no working-days control and still submits the previously loaded working days", async () => {
    const submit = vi.fn()
    render(
      <GeneralSettingsForm
        settings={generalSettings}
        lookups={lookups}
        pending={false}
        onSubmit={submit}
      />
    )

    expect(screen.queryByText("أيام العمل")).not.toBeInTheDocument()
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0)

    await userEvent.click(screen.getByRole("button", { name: "حفظ التغييرات" }))

    expect(submit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ workingDays: generalSettings.workingDays })
    )
  })
})
