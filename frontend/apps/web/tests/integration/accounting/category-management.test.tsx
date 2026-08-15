import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CategoryDialog } from "@/features/accounting/forms/category-form"
import {
  CategoryStatusBadge,
  categoryColumns,
  subCategoryColumns,
} from "@/features/accounting/components/category-columns"
import type { ExpenseCategorySummary } from "@/features/accounting/types/projections"

afterEach(cleanup)

const parents = [
  { value: "category-marketing", label: "التسويق" },
  { value: "category-office", label: "المكتب" },
]

describe("the category dialog", () => {
  it("requires a name", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CategoryDialog title="تصنيف جديد" pending={false} onSubmit={onSubmit} onClose={vi.fn()} />
    )

    await user.click(screen.getByRole("button", { name: "حفظ" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/الاسم مطلوب/)
  })

  it("moves focus to the first invalid field", async () => {
    const user = userEvent.setup()
    render(
      <CategoryDialog title="تصنيف جديد" pending={false} onSubmit={vi.fn()} onClose={vi.fn()} />
    )
    await user.click(screen.getByRole("button", { name: "حفظ" }))
    expect(screen.getByLabelText(/^الاسم$/)).toHaveFocus()
  })

  it("submits a valid category", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CategoryDialog title="تصنيف جديد" pending={false} onSubmit={onSubmit} onClose={vi.fn()} />
    )

    await user.type(screen.getByLabelText(/^الاسم$/), "التسويق")
    await user.type(screen.getByLabelText(/الوصف/), "الحملات")
    await user.click(screen.getByRole("button", { name: "حفظ" }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "التسويق", description: "الحملات" })
    )
  })

  it("takes focus on open", () => {
    render(
      <CategoryDialog title="تصنيف جديد" pending={false} onSubmit={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByLabelText(/^الاسم$/)).toHaveFocus()
  })

  it("prefills when editing", () => {
    render(
      <CategoryDialog
        title="تعديل"
        initial={{ name: "التسويق", description: "الحملات" }}
        pending={false}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/^الاسم$/)).toHaveValue("التسويق")
  })
})

describe("the sub-category dialog adds a parent selector", () => {
  it("offers no parent selector for a category", () => {
    render(
      <CategoryDialog title="تصنيف" pending={false} onSubmit={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.queryByLabelText(/التصنيف الرئيسي/)).not.toBeInTheDocument()
  })

  it("offers the active parents for a sub-category", () => {
    render(
      <CategoryDialog
        title="تصنيف فرعي"
        parents={parents}
        pending={false}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole("option", { name: "التسويق" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "المكتب" })).toBeInTheDocument()
  })

  it("requires a parent", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CategoryDialog
        title="تصنيف فرعي"
        parents={parents}
        pending={false}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    )

    await user.type(screen.getByLabelText(/^الاسم$/), "إعلانات فيسبوك")
    await user.click(screen.getByRole("button", { name: "حفظ" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/التصنيف الرئيسي مطلوب/)
  })

  it("submits with its parent", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CategoryDialog
        title="تصنيف فرعي"
        parents={parents}
        pending={false}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    )

    await user.selectOptions(screen.getByLabelText(/التصنيف الرئيسي/), "category-office")
    await user.type(screen.getByLabelText(/^الاسم$/), "قرطاسية")
    await user.click(screen.getByRole("button", { name: "حفظ" }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "category-office", name: "قرطاسية" })
    )
  })
})

describe("status is readable as text, not colour", () => {
  it("labels an active category", () => {
    render(<CategoryStatusBadge status="active" />)
    expect(screen.getByText("نشط")).toBeInTheDocument()
  })

  it("labels an archived category", () => {
    render(<CategoryStatusBadge status="archived" />)
    expect(screen.getByText("مؤرشف")).toBeInTheDocument()
  })
})

describe("row actions follow the manage permission", () => {
  const row: ExpenseCategorySummary = {
    id: "category-marketing",
    name: "التسويق",
    description: "الحملات",
    status: "active",
    subCategoryCount: 4,
    updatedAt: "2026-07-01T09:00:00.000Z",
    version: 1,
  } as ExpenseCategorySummary

  const renderActionCell = (canManage: boolean) => {
    const columns = categoryColumns({
      canManage,
      onEdit: vi.fn(),
      onToggleStatus: vi.fn(),
    })
    const actions = columns.find((column) => column.id === "actions")!
    const cell = actions.cell as (context: unknown) => React.ReactNode
    return render(<>{cell({ row: { original: row } })}</>)
  }

  it("offers edit and archive to a manager", () => {
    renderActionCell(true)
    expect(screen.getByRole("button", { name: "تعديل" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "أرشفة" })).toBeInTheDocument()
  })

  it("offers nothing to a user who may only view", () => {
    // An action they can never take is not an affordance, it is noise.
    renderActionCell(false)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("offers reactivation on an archived row", () => {
    const columns = categoryColumns({
      canManage: true,
      onEdit: vi.fn(),
      onToggleStatus: vi.fn(),
    })
    const actions = columns.find((column) => column.id === "actions")!
    const cell = actions.cell as (context: unknown) => React.ReactNode
    render(<>{cell({ row: { original: { ...row, status: "archived" } } })}</>)
    expect(screen.getByRole("button", { name: "تفعيل" })).toBeInTheDocument()
  })
})

describe("the sub-category table names its parent", () => {
  it("includes a parent column", () => {
    const columns = subCategoryColumns({
      canManage: false,
      onEdit: vi.fn(),
      onToggleStatus: vi.fn(),
    })
    expect(columns.map((column) => column.id)).toContain("التصنيف الرئيسي")
  })
})
