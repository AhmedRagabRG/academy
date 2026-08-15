import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, type BulkAction } from "@/shared/components/data-table/data-table"

afterEach(cleanup)

interface Row {
  id: string
  label: string
}

const rows: Row[] = [
  { id: "r1", label: "الأول" },
  { id: "r2", label: "الثاني" },
  { id: "r3", label: "الثالث" },
]

const columns: ColumnDef<Row>[] = [
  { id: "label", accessorKey: "label", header: "العنوان" },
]

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  render(
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      {...props}
    />
  )
}

/**
 * Selects a body row by its label. Indexing `getAllByRole("checkbox")` would also
 * pick up the column-visibility toggles in the toolbar.
 */
const selectRow = async (
  user: ReturnType<typeof userEvent.setup>,
  label: string
) => {
  const row = screen.getByRole("row", { name: new RegExp(label) })
  await user.click(within(row).getByRole("checkbox"))
}

/**
 * Accounting needs several distinct bulk actions on one queue. A single generic
 * button cannot say which is about to run, so the shared table gained named
 * actions — additively, leaving the original single-callback surface intact.
 */
describe("named bulk actions", () => {
  it("renders one button per action, each with its own label", () => {
    const bulkActions: BulkAction<Row>[] = [
      { id: "submit", label: "تقديم المحدد", run: vi.fn() },
      { id: "approve", label: "اعتماد المحدد", run: vi.fn() },
    ]
    renderTable({ bulkActions })

    expect(screen.getByRole("button", { name: /تقديم المحدد/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /اعتماد المحدد/ })).toBeInTheDocument()
  })

  it("shows the selection count on each action", async () => {
    const user = userEvent.setup()
    renderTable({
      bulkActions: [{ id: "submit", label: "تقديم المحدد", run: vi.fn() }],
    })

    await selectRow(user, "الأول")
    expect(screen.getByRole("button", { name: /تقديم المحدد \(1\)/ })).toBeInTheDocument()
  })

  it("passes exactly the selected rows to the right handler", async () => {
    const user = userEvent.setup()
    const submit = vi.fn()
    const approve = vi.fn()
    renderTable({
      bulkActions: [
        { id: "submit", label: "تقديم المحدد", run: submit },
        { id: "approve", label: "اعتماد المحدد", run: approve },
      ],
    })

    await selectRow(user, "الأول")
    await selectRow(user, "الثالث")
    await user.click(screen.getByRole("button", { name: /اعتماد المحدد/ }))

    expect(submit).not.toHaveBeenCalled()
    expect(approve).toHaveBeenCalledTimes(1)
    expect(approve.mock.calls[0]![0]).toHaveLength(2)
    expect(
      (approve.mock.calls[0]![0] as Row[]).map((row) => row.id).sort()
    ).toEqual(["r1", "r3"])
  })

  it("disables every action while nothing is selected", () => {
    renderTable({
      bulkActions: [
        { id: "submit", label: "تقديم المحدد", run: vi.fn() },
        { id: "approve", label: "اعتماد المحدد", run: vi.fn() },
      ],
    })

    expect(screen.getByRole("button", { name: /تقديم المحدد/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /اعتماد المحدد/ })).toBeDisabled()
  })

  it("respects a per-action disabled flag even when rows are selected", async () => {
    const user = userEvent.setup()
    renderTable({
      bulkActions: [
        { id: "submit", label: "تقديم المحدد", run: vi.fn(), disabled: true },
      ],
    })

    await selectRow(user, "الأول")
    expect(screen.getByRole("button", { name: /تقديم المحدد/ })).toBeDisabled()
  })

  it("hides an action the acting user may not perform", async () => {
    renderTable({
      bulkActions: [
        { id: "submit", label: "تقديم المحدد", run: vi.fn() },
        { id: "approve", label: "اعتماد المحدد", run: vi.fn(), hidden: true },
      ],
    })

    // Hidden rather than disabled: an action they can never take is not an
    // affordance, it is noise.
    expect(screen.getByRole("button", { name: /تقديم المحدد/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /اعتماد المحدد/ })).not.toBeInTheDocument()
  })

  it("renders no bulk controls at all when none are supplied", () => {
    renderTable()
    expect(screen.queryByRole("button", { name: /إجراء جماعي/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /المحدد/ })).not.toBeInTheDocument()
  })
})

/** The pre-existing surface must keep working untouched. */
describe("the original single bulk action still works", () => {
  it("renders the generic button and passes the selection", async () => {
    const user = userEvent.setup()
    const onBulkAction = vi.fn()
    renderTable({ onBulkAction })

    await selectRow(user, "الثاني")
    const button = screen.getByRole("button", { name: /إجراء جماعي \(1\)/ })
    await user.click(button)

    expect(onBulkAction).toHaveBeenCalledTimes(1)
    expect((onBulkAction.mock.calls[0]![0] as Row[])[0]!.id).toBe("r2")
  })

  it("coexists with named actions without either interfering", async () => {
    const user = userEvent.setup()
    const onBulkAction = vi.fn()
    const named = vi.fn()
    renderTable({
      onBulkAction,
      bulkActions: [{ id: "submit", label: "تقديم المحدد", run: named }],
    })

    await selectRow(user, "الأول")
    await user.click(screen.getByRole("button", { name: /تقديم المحدد/ }))

    expect(named).toHaveBeenCalledTimes(1)
    expect(onBulkAction).not.toHaveBeenCalled()
  })
})
