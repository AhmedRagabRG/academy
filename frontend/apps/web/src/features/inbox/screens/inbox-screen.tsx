"use client"
import { useMemo } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { LoadingState } from "@/shared/components/states/loading-state"
import { usePermission } from "@/shared/hooks/use-permission"
import { inboxPermissions } from "../config/inbox-permissions"
import {
  useInboxDashboard,
  useInboxList,
  useInboxLookups,
} from "../hooks/use-inbox-list"
import { useInboxSelection } from "../hooks/use-inbox-selection"
import { useInboxConversation } from "../hooks/use-inbox-conversation"
import { useInboxWorkspaceStore } from "../stores/inbox-workspace-store"
import { InboxLayout } from "../components/inbox-layout"
import { InboxSidebar } from "../components/inbox-sidebar"
import { InboxDashboard } from "../components/inbox-dashboard"
import { InboxSearch } from "../components/inbox-search"
import { InboxToolbar } from "../components/inbox-toolbar"
import { ConversationList } from "../components/conversation-list"
import { CustomerProfile } from "../components/customer-profile"
import { ConversationTags } from "../components/conversation-tags"
import { ConversationWorkspace } from "./conversation-workspace"
import { useInboxRealtime } from "../hooks/use-inbox-realtime"

const InternalNotesPanel = dynamic(() =>
  import("../components/internal-notes-panel").then(
    (module) => module.InternalNotesPanel
  )
)

function HomeLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      aria-label="العودة إلى الرئيسية"
      className={`inline-flex h-10 items-center text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring ${
        compact ? "w-fit" : "w-full border-b px-1 pb-3"
      }`}
    >
      العودة للرئيسية
    </Link>
  )
}

export function InboxScreen() {
  useInboxRealtime()
  const list = useInboxList()
  const dashboard = useInboxDashboard()
  const lookups = useInboxLookups()
  const detail = useInboxConversation()
  const query = useInboxWorkspaceStore((state) => state.query)
  const selectedId = useInboxWorkspaceStore((state) => state.selectedId)
  const pane = useInboxWorkspaceStore((state) => state.mobilePane)
  const select = useInboxWorkspaceStore((state) => state.select)
  const setView = useInboxWorkspaceStore((state) => state.setView)
  const patchQuery = useInboxWorkspaceStore((state) => state.patchQuery)
  const recent = useInboxWorkspaceStore((state) => state.recentSearches)
  const rememberSearch = useInboxWorkspaceStore((state) => state.rememberSearch)
  const rows = useMemo(
    () => list.data?.pages.flatMap((page) => page.items) ?? [],
    [list.data]
  )
  useInboxSelection(rows)
  const canTags = usePermission(inboxPermissions.manageTags)
  const canNotes = usePermission(inboxPermissions.manageNotes)
  if (!lookups.data) return <LoadingState label="جارٍ إعداد صندوق الوارد" />
  const sidebar = (
    <div className="space-y-5">
      <HomeLink />
      <InboxSidebar active={query.view} onChange={setView} />
      {dashboard.data && <InboxDashboard data={dashboard.data} />}
    </div>
  )
  const listPanel = (
    <>
      <div className="space-y-3 border-b p-3">
        <div className="lg:hidden">
          <HomeLink compact />
        </div>
        <InboxSearch
          value={query.search}
          recent={recent}
          onChange={(search) => patchQuery({ search })}
          onCommit={() => rememberSearch(query.search)}
        />
        <InboxToolbar
          query={query}
          lookups={lookups.data}
          onChange={patchQuery}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ConversationList
          rows={rows}
          selectedId={selectedId}
          loading={list.isLoading}
          error={list.error}
          hasMore={Boolean(list.hasNextPage)}
          fetchingMore={list.isFetchingNextPage}
          onSelect={select}
          onMore={() => void list.fetchNextPage()}
          onRetry={() => void list.refetch()}
        />
      </div>
    </>
  )
  const details = detail.data ? (
    <div className="space-y-6">
      <button
        className="text-sm text-primary xl:hidden"
        onClick={() =>
          useInboxWorkspaceStore.getState().setMobilePane("conversation")
        }
      >
        العودة إلى المحادثة
      </button>
      <CustomerProfile conversation={detail.data} />
      <ConversationTags
        conversation={detail.data}
        lookups={lookups.data}
        allowed={canTags}
      />
      <InternalNotesPanel conversation={detail.data} allowed={canNotes} />
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">
      تظهر بيانات العميل هنا بعد اختيار محادثة.
    </p>
  )
  return (
    <div className="fixed inset-0 z-50 h-dvh overflow-hidden bg-background">
      <InboxLayout
        sidebar={sidebar}
        list={listPanel}
        workspace={<ConversationWorkspace lookups={lookups.data} />}
        details={details}
        pane={pane}
      />
    </div>
  )
}
