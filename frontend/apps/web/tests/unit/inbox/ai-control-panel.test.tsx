import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AiControlPanel } from "@/features/inbox/components/ai-control-panel"
import type { ConversationDetail } from "@/features/inbox/types/projections"

const mocks = vi.hoisted(() => ({
  canControl: true,
  pause: { isPending: false, mutate: vi.fn() },
  resume: { isPending: false, mutate: vi.fn() },
}))

vi.mock("@/shared/hooks/use-permission", () => ({
  usePermission: () => mocks.canControl,
}))
vi.mock("@/features/inbox/hooks/use-inbox-management", () => ({
  usePauseAi: () => mocks.pause,
  useResumeAi: () => mocks.resume,
}))

const conversation = {
  id: "conversation" as never,
  customerId: "customer" as never,
  platformId: "platform" as never,
  status: "open",
  assignedEmployeeId: null,
  assignedTeamId: null,
  tagIds: [],
  unreadCount: 0,
  lastMessage: "مرحبا",
  lastActivityAt: "2026-09-10T12:00:00.000Z",
  version: 1,
  ai: {
    mode: "auto",
    pausedReason: null,
    pausedAt: null,
    resumeAt: null,
    agentEnabled: true,
    version: 3,
  },
  customer: {
    id: "customer" as never,
    name: "عميل",
    phone: "0100",
    firstContactAt: "2026-09-01T12:00:00.000Z",
    lastActivityAt: "2026-09-10T12:00:00.000Z",
  },
  platform: {
    id: "platform" as never,
    code: "whatsapp",
    label: "واتساب",
    icon: "message",
    active: true,
  },
  employee: null,
  team: null,
  tags: [],
  messages: [],
  notes: [],
  assignmentHistory: [],
  systemEvents: [],
  crm: null,
} satisfies ConversationDetail

beforeEach(() => {
  mocks.canControl = true
  mocks.pause.isPending = false
  mocks.resume.isPending = false
  mocks.pause.mutate.mockClear()
  mocks.resume.mutate.mockClear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("AiControlPanel", () => {
  it("shows an active assistant and permits pausing", () => {
    render(<AiControlPanel conversation={conversation} />)
    expect(screen.getByText("نشط")).toBeVisible()
    expect(screen.getByRole("button", { name: "إيقاف المساعد" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "تشغيل المساعد" })).toBeDisabled()
  })

  it("shows a live relative countdown for a scheduled resume", () => {
    render(
      <AiControlPanel
        conversation={{
          ...conversation,
          ai: {
            ...conversation.ai!,
            mode: "paused",
            pausedReason: "human-reply",
            pausedAt: "2026-09-10T11:55:00.000Z",
            resumeAt: "2026-09-10T12:05:00.000Z",
          },
        }}
      />
    )
    expect(screen.getByText("متوقف مؤقتًا")).toBeVisible()
    expect(screen.getByText("سبب الإيقاف: ردّ موظف على المحادثة")).toBeVisible()
    expect(screen.getByText(/الاستئناف التلقائي.*5 دقائق/)).toBeVisible()
  })

  it("explains when a paused assistant will never resume automatically", () => {
    render(
      <AiControlPanel
        conversation={{
          ...conversation,
          ai: {
            ...conversation.ai!,
            mode: "paused",
            pausedReason: "manual",
            pausedAt: "2026-09-10T11:55:00.000Z",
          },
        }}
      />
    )
    expect(screen.getByText("لن يُستأنف تلقائيًا")).toBeVisible()
    expect(screen.getByRole("button", { name: "تشغيل المساعد" })).toBeEnabled()
  })

  it("hides both controls without permission", () => {
    mocks.canControl = false
    render(<AiControlPanel conversation={conversation} />)
    expect(
      screen.queryByRole("button", { name: "إيقاف المساعد" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "تشغيل المساعد" })
    ).not.toBeInTheDocument()
  })
})
