import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { usePermission } from "@/shared/hooks/use-permission"
import { savedViews } from "../config/inbox-config"
import { inboxChannelsNavigation } from "../config/navigation"
import type { SavedViewKey } from "../types/common"

export function InboxSidebar({
  active,
  onChange,
}: {
  active: SavedViewKey
  onChange: (view: SavedViewKey) => void
}) {
  const canViewChannels = usePermission(inboxChannelsNavigation.permissionKey!)

  return (
    <nav aria-label="طرق عرض صندوق الوارد" className="space-y-3">
      <div className="space-y-1">
        <p className="px-3 text-xs font-medium text-muted-foreground">
          صندوق الوارد
        </p>
        {savedViews.map((view) => {
          return (
            <Button
              key={view.key}
              variant={active === view.key ? "secondary" : "ghost"}
              className="w-full justify-start"
              aria-current={active === view.key ? "page" : undefined}
              onClick={() => onChange(view.key)}
            >
              {view.label}
            </Button>
          )
        })}
      </div>
      {canViewChannels && (
        <div className="ms-3 space-y-1 border-s ps-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            render={<Link href={inboxChannelsNavigation.route!} />}
          >
            {inboxChannelsNavigation.title}
          </Button>
        </div>
      )}
    </nav>
  )
}
