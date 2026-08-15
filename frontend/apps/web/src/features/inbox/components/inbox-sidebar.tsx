import { Button } from "@workspace/ui/components/button"
import { savedViews } from "../config/inbox-config"
import type { SavedViewKey } from "../types/common"
export function InboxSidebar({
  active,
  onChange,
}: {
  active: SavedViewKey
  onChange: (view: SavedViewKey) => void
}) {
  return (
    <nav aria-label="طرق عرض صندوق الوارد" className="space-y-1">
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
    </nav>
  )
}
