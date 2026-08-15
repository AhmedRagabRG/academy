import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it } from "vitest"
import { TicketBoardScreen } from "@/features/tickets"
import { mockTicketService } from "@/features/tickets/services/mock-ticket-service"

function renderBoard() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><TicketBoardScreen /></QueryClientProvider>) }
describe("Ticket board", () => {
  beforeEach(() => mockTicketService.reset())
  it("renders dashboard, workflow columns, cards, search, and status alternative", async () => {
    renderBoard()
    expect(await screen.findByRole("heading", { name: "إدارة التذاكر" })).toBeInTheDocument()
    expect(await screen.findByRole("heading", { name: "قائمة الانتظار" })).toBeInTheDocument()
    expect(screen.getByText("المفتوحة")).toBeInTheDocument()
    expect(screen.getAllByLabelText("نقل التذكرة إلى حالة").length).toBeGreaterThan(0)
    const search = screen.getByPlaceholderText("ابحث في التذاكر")
    await userEvent.type(search, "TKT-1047")
    expect(await screen.findByText("تعذر إتمام تسجيل الدفعة")).toBeInTheDocument()
    expect(screen.queryByText("تحديث بيانات ولي الأمر")).not.toBeInTheDocument()
  })
})
