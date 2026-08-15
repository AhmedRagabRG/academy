import { LoaderCircle } from "lucide-react"

export function LoadingState({ label = "جارٍ التحميل" }: { label?: string }) {
  return (
    <div role="status" className="text-muted-foreground flex min-h-40 items-center justify-center gap-2">
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
