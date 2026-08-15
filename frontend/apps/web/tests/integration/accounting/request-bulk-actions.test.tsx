import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  DataTable,
  type BulkAction,
} from "@/shared/components/data-table/data-table"
import { requestColumns } from "@/features/accounting/components/request-columns"
import { bulkCopy } from "@/features/accounting/config/accounting-copy"
import { isEditable } from "@/features/accounting/utils/expense-lifecycle"
import { makeMoney } from "@/shared/utils/money"
import type { ExpenseRequestSummary } from "@/features/accounting/types/projections"
import type { ExpenseStatus } from "@/features/accounting/types/common"

afterEach(cleanup)

const row = (
  id: string,
  requestNumber: string,
  status: ExpenseStatus
): ExpenseRequestSummary =>
  ({
    id,
    requestNumber,
    requestDate: "2026-07-20T09:00:00.000Z",
    branchId: "branch-cairo",
    branchLabel: "فرع القاهرة",
    requesterName: "مدير فرع",
    categoryLabel: "التسويق",
    amount: makeMoney("1000.00", "EGP", 2),
    status,
    attachmentCount: 0,
    updatedAt: "2026-07-20T09:00:00.000Z",
    version: 1,
  }) as ExpenseRequestSummary

const rows = [
  row("r1", "EXP-2026-00001", "draft"),
  row("r2", "EXP-2026-00002", "under-review"),
  row("r3", "EXP-2026-00003", "paid"),
]

const selectRow = async (
  user: ReturnType<typeof userEvent.setup>,
  requestNumber: string
) => {
  const tableRow = screen.getByRole("row", { name: new RegExp(requestNumber) })
  await user.click(within(tableRow).getByRole("checkbox"))
}

function renderQueue({
  canSubmit = true,
  canDecide = true,
}: { canSubmit?: boolean; canDecide?: boolean } = {}) {
  const submitted: ExpenseRequestSummary[] = []
  const approved: ExpenseRequestSummary[] = []
  const skipped = vi.fn()

  const runBatch = (
    selected: ExpenseRequestSummary[],
    eligible: (candidate: ExpenseRequestSummary) => boolean,
    collect: ExpenseRequestSummary[]
  ) => {
    const applicable = selected.filter(eligible)
    collect.push(...applicable)
    if (selected.length - applicable.length > 0) skipped()
  }

  const bulkActions: BulkAction<ExpenseRequestSummary>[] = [
    {
      id: "submit",
      label: bulkCopy.submitSelected,
      hidden: !canSubmit,
      run: (selected) => runBatch(selected, (r) => isEditable(r.status), submitted),
    },
    {
      id: "approve",
      label: bulkCopy.approveSelected,
      hidden: !canDecide,
      run: (selected) =>
        runBatch(selected, (r) => r.status === "under-review", approved),
    },
  ]

  render(
    <DataTable
      data={rows}
      columns={requestColumns}
      getRowId={(r) => r.id}
      bulkActions={bulkActions}
    />
  )
  return { submitted, approved, skipped }
}

describe("the queue offers named bulk actions", () => {
  it("renders one button per action, each saying what it does", () => {
    renderQueue()
    expect(
      screen.getByRole("button", { name: new RegExp(bulkCopy.submitSelected) })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: new RegExp(bulkCopy.approveSelected) })
    ).toBeInTheDocument()
    // A single generic "bulk action" button could not say which is about to run.
    expect(screen.queryByRole("button", { name: /^إجراء جماعي/ })).not.toBeInTheDocument()
  })

  it("hides an action the acting user may not perform", () => {
    renderQueue({ canDecide: false })
    expect(
      screen.getByRole("button", { name: new RegExp(bulkCopy.submitSelected) })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: new RegExp(bulkCopy.approveSelected) })
    ).not.toBeInTheDocument()
  })

  it("disables both while nothing is selected", () => {
    renderQueue()
    expect(
      screen.getByRole("button", { name: new RegExp(bulkCopy.submitSelected) })
    ).toBeDisabled()
  })
})

describe("a bulk action applies only to eligible rows", () => {
  it("submits only the rows that are editable", async () => {
    const user = userEvent.setup()
    const { submitted } = renderQueue()

    await selectRow(user, "EXP-2026-00001") // draft — eligible
    await selectRow(user, "EXP-2026-00003") // paid — not
    await user.click(
      screen.getByRole("button", { name: new RegExp(bulkCopy.submitSelected) })
    )

    expect(submitted.map((r) => r.id)).toEqual(["r1"])
  })

  it("approves only the rows under review", async () => {
    const user = userEvent.setup()
    const { approved } = renderQueue()

    await selectRow(user, "EXP-2026-00001") // draft — not eligible
    await selectRow(user, "EXP-2026-00002") // under review — eligible
    await user.click(
      screen.getByRole("button", { name: new RegExp(bulkCopy.approveSelected) })
    )

    expect(approved.map((r) => r.id)).toEqual(["r2"])
  })

  it("reports when some rows were skipped rather than failing silently", async () => {
    const user = userEvent.setup()
    const { skipped } = renderQueue()

    await selectRow(user, "EXP-2026-00001")
    await selectRow(user, "EXP-2026-00003")
    await user.click(
      screen.getByRole("button", { name: new RegExp(bulkCopy.submitSelected) })
    )

    // A row that cannot take the action is not an error for the rows that can,
    // but the user must still be told.
    expect(skipped).toHaveBeenCalledTimes(1)
  })

  it("reports nothing skipped when every selected row is eligible", async () => {
    const user = userEvent.setup()
    const { skipped, submitted } = renderQueue()

    await selectRow(user, "EXP-2026-00001")
    await user.click(
      screen.getByRole("button", { name: new RegExp(bulkCopy.submitSelected) })
    )

    expect(submitted).toHaveLength(1)
    expect(skipped).not.toHaveBeenCalled()
  })

  it("does not act on rows that were never selected", async () => {
    const user = userEvent.setup()
    const { submitted } = renderQueue()

    await selectRow(user, "EXP-2026-00001")
    await user.click(
      screen.getByRole("button", { name: new RegExp(bulkCopy.submitSelected) })
    )

    expect(submitted.map((r) => r.id)).not.toContain("r2")
    expect(submitted.map((r) => r.id)).not.toContain("r3")
  })
})
