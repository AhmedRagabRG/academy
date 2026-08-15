import { Button } from "@workspace/ui/components/button"
export function InboxResponsiveNavigation({
  onBack,
  onDetails,
}: {
  onBack: () => void
  onDetails: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b p-2 lg:hidden">
      <Button variant="ghost" onClick={onBack}>
        المحادثات
      </Button>
      <Button variant="ghost" onClick={onDetails}>
        التفاصيل
      </Button>
    </div>
  )
}
