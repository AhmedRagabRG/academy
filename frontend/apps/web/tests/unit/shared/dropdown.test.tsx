import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Dropdown } from "@/shared/components/forms/dropdown"
describe("shared dropdown", () => { it("provides one accessible branded selector contract", async () => { const onChange = vi.fn(); render(<Dropdown aria-label="الحالة" options={[{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }]} defaultValue="active" onChange={onChange} />); await userEvent.selectOptions(screen.getByLabelText("الحالة"), "inactive"); expect(onChange).toHaveBeenCalled() }) })
