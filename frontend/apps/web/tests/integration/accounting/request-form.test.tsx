import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  ExpenseRequestForm,
  validateExpenseRequest,
  type ExpenseRequestFormOptions,
} from "@/features/accounting/forms/expense-request-form"
import { emptyExpenseRequestValues } from "@/features/accounting/schemas/expense-request-schemas"

afterEach(cleanup)

const options: ExpenseRequestFormOptions = {
  precision: 2,
  branches: [
    { value: "branch-cairo", label: "فرع القاهرة" },
    { value: "branch-giza", label: "فرع الجيزة" },
  ],
  categories: [
    { id: "category-marketing", name: "التسويق", status: "active" },
    { id: "category-office", name: "المكتب", status: "active" },
    { id: "category-legacy", name: "بند قديم", status: "archived" },
  ],
  subCategories: [
    { id: "sub-facebook", categoryId: "category-marketing", name: "إعلانات فيسبوك", status: "active" },
    { id: "sub-printing", categoryId: "category-marketing", name: "المطبوعات", status: "active" },
    { id: "sub-stationery", categoryId: "category-office", name: "قرطاسية", status: "active" },
    { id: "sub-old", categoryId: "category-marketing", name: "قديم", status: "archived" },
  ],
}

function renderForm(initial = emptyExpenseRequestValues) {
  const onChange = vi.fn()
  let values = initial
  const rerenderWith = (next: typeof values) => {
    values = next
    onChange(next)
  }
  const view = render(
    <ExpenseRequestForm
      values={values}
      errors={{}}
      options={options}
      onChange={rerenderWith}
    />
  )
  return { onChange, view, get values() { return values } }
}

describe("only selectable options are offered", () => {
  it("offers active categories and omits archived ones", () => {
    renderForm()
    expect(screen.getByRole("option", { name: "التسويق" })).toBeInTheDocument()
    // An archived category must not be choosable on a new request.
    expect(screen.queryByRole("option", { name: "بند قديم" })).not.toBeInTheDocument()
  })

  it("offers sub-categories only for the chosen category", async () => {
    const harness = renderForm({
      ...emptyExpenseRequestValues,
      categoryId: "category-marketing",
    })
    void harness
    expect(screen.getByRole("option", { name: "إعلانات فيسبوك" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "قرطاسية" })).not.toBeInTheDocument()
  })

  it("omits archived sub-categories", () => {
    renderForm({ ...emptyExpenseRequestValues, categoryId: "category-marketing" })
    expect(screen.queryByRole("option", { name: "قديم" })).not.toBeInTheDocument()
  })

  it("offers no sub-categories before a category is chosen", () => {
    renderForm()
    const select = screen.getByLabelText(/التصنيف الفرعي/)
    // Only the placeholder.
    expect(select.querySelectorAll("option")).toHaveLength(1)
  })
})

describe("changing the main category clears an inconsistent sub-category", () => {
  it("clears a sub-category that does not belong to the new parent", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ExpenseRequestForm
        values={{
          ...emptyExpenseRequestValues,
          categoryId: "category-marketing",
          subCategoryId: "sub-facebook",
        }}
        errors={{}}
        options={options}
        onChange={onChange}
      />
    )

    await user.selectOptions(screen.getByLabelText(/التصنيف الرئيسي/), "category-office")

    // Leaving a stale sub-category selected would submit a combination the
    // service refuses, with no visible cause.
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "category-office", subCategoryId: "" })
    )
  })

  it("keeps a sub-category that still belongs to the new parent", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ExpenseRequestForm
        values={{
          ...emptyExpenseRequestValues,
          categoryId: "category-marketing",
          subCategoryId: "sub-printing",
        }}
        errors={{}}
        options={options}
        onChange={onChange}
      />
    )

    await user.selectOptions(screen.getByLabelText(/التصنيف الرئيسي/), "category-marketing")
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ subCategoryId: "sub-printing" })
    )
  })
})

describe("errors are announced and tied to their field", () => {
  it("renders each error as an alert referenced by its input", () => {
    render(
      <ExpenseRequestForm
        values={emptyExpenseRequestValues}
        errors={{ amount: "يجب أن يكون المبلغ أكبر من صفر" }}
        options={options}
        onChange={vi.fn()}
      />
    )

    const input = screen.getByLabelText(/المبلغ المطلوب/)
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAttribute("aria-describedby")
    expect(screen.getByRole("alert")).toHaveTextContent("أكبر من صفر")
  })

  it("marks nothing invalid when there are no errors", () => {
    renderForm()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("validation matches what the service enforces", () => {
  const complete = {
    requestDate: "2026-08-01",
    branchId: "branch-cairo",
    categoryId: "category-marketing",
    subCategoryId: "sub-facebook",
    description: "حملة إعلانية",
    amount: "1500.00",
  }

  it("accepts a complete request", () => {
    expect(validateExpenseRequest(complete, options).ok).toBe(true)
  })

  it("names every missing field rather than failing generically", () => {
    const result = validateExpenseRequest(emptyExpenseRequestValues, options)
    expect(result.ok).toBe(false)
    if (result.ok) return
    for (const field of ["requestDate", "branchId", "categoryId", "description", "amount"])
      expect(Object.keys(result.errors), field).toContain(field)
  })

  it("refuses a zero amount with a message a user can act on", () => {
    const result = validateExpenseRequest({ ...complete, amount: "0" }, options)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.amount).toContain("أكبر من صفر")
  })

  it("refuses a sub-category from another parent", () => {
    const result = validateExpenseRequest(
      { ...complete, subCategoryId: "sub-stationery" },
      options
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.subCategoryId).toContain("لا يتبع")
  })

  it("refuses an archived category", () => {
    const result = validateExpenseRequest(
      { ...complete, categoryId: "category-legacy", subCategoryId: "" },
      options
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.categoryId).toContain("مؤرشف")
  })
})

describe("a disabled form cannot be edited", () => {
  it("disables every control when the request is locked", () => {
    render(
      <ExpenseRequestForm
        values={emptyExpenseRequestValues}
        errors={{}}
        options={options}
        disabled
        onChange={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/المبلغ المطلوب/)).toBeDisabled()
    expect(screen.getByLabelText(/^الفرع$/)).toBeDisabled()
    expect(screen.getByLabelText(/الوصف/)).toBeDisabled()
  })
})
