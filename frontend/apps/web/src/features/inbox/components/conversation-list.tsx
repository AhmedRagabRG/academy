import { Button } from "@workspace/ui/components/button"
import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import type { ConversationView } from "../types/projections"
import type { ConversationId } from "../types/common"
import { ConversationCard } from "./conversation-card"
export function ConversationList({
  rows,
  selectedId,
  loading,
  error,
  hasMore,
  fetchingMore,
  onSelect,
  onMore,
  onRetry,
}: {
  rows: ConversationView[]
  selectedId: ConversationId | null
  loading: boolean
  error?: Error | null
  hasMore: boolean
  fetchingMore: boolean
  onSelect: (id: ConversationId) => void
  onMore: () => void
  onRetry: () => void
}) {
  if (loading) return <LoadingState label="جارٍ تحميل المحادثات" />
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />
  if (!rows.length)
    return (
      <EmptyState
        title="لا توجد محادثات مطابقة"
        description="غيّر البحث أو أزل بعض عوامل التصفية."
      />
    )
  return (
    <div>
      <div role="list" aria-label="المحادثات" className="space-y-1">
        {rows.map((row) => (
          <div role="listitem" key={row.id}>
            <ConversationCard
              row={row}
              selected={selectedId === row.id}
              onSelect={() => onSelect(row.id)}
            />
          </div>
        ))}
      </div>
      {hasMore && (
        <Button
          className="mt-3 w-full"
          variant="outline"
          disabled={fetchingMore}
          onClick={onMore}
        >
          {fetchingMore ? "جارٍ تحميل المزيد..." : "تحميل المزيد"}
        </Button>
      )}
    </div>
  )
}
