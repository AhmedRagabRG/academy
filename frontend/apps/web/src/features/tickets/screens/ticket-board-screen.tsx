"use client"
import { useState } from "react"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { LoadingState } from "@/shared/components/states/loading-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { EmptyState } from "@/shared/components/states/empty-state"
import { ticketCopy } from "../config/ticket-copy"
import type { TicketFilters, TicketSort } from "../types/commands"
import { useTicketBoard } from "../hooks/use-ticket-board"
import { useTicketMutations } from "../hooks/use-ticket-mutations"
import { TicketDashboard } from "../components/ticket-dashboard"
import { TicketBoardHeader } from "../components/ticket-board-header"
import { TicketKanbanBoard } from "../components/ticket-kanban-board"

export function TicketBoardScreen() {
  const [search, setSearch] = useState(""),
    [filters, setFilters] = useState<TicketFilters>({}),
    [sort, setSort] = useState<TicketSort>("updated")
  const board = useTicketBoard(search, filters, sort),
    actions = useTicketMutations(board.actor, board.scope)
  return (
    <PageContainer className="min-w-0">
      <PageHeader
        title={ticketCopy.title}
        description={ticketCopy.description}
      />
      <div className="space-y-6">
        {board.configuration.data && (
          <TicketBoardHeader
            configuration={board.configuration.data}
            search={search}
            onSearch={setSearch}
            filters={filters}
            onFilters={setFilters}
            sort={sort}
            onSort={setSort}
            pending={actions.create.isPending}
            onCreate={(value) => actions.create.mutateAsync(value)}
          />
        )}
        {board.configuration.isLoading && (
          <LoadingState label="جارٍ تحميل إعدادات التذاكر…" />
        )}
        {board.configuration.error && (
          <ErrorState
            message={board.configuration.error.message}
            onRetry={() => void board.configuration.refetch()}
          />
        )}
        {board.dashboard.data && (
          <TicketDashboard data={board.dashboard.data} />
        )}
        {board.list.isLoading && <LoadingState label={ticketCopy.loading} />}
        {board.list.error && (
          <ErrorState
            message={board.list.error.message}
            onRetry={() => void board.list.refetch()}
          />
        )}
        {board.list.data?.items.length === 0 && (
          <EmptyState
            title={
              search || Object.keys(filters).length
                ? ticketCopy.noResults
                : ticketCopy.empty
            }
          />
        )}
        {board.list.data && board.list.data.items.length > 0 && (
          <TicketKanbanBoard
            tickets={board.list.data.items}
            onMove={(ticket, status) =>
              actions.status.mutate({
                id: ticket.id,
                status,
                version: ticket.version,
              })
            }
          />
        )}
      </div>
    </PageContainer>
  )
}
