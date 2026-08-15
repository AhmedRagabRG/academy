import { Button } from "@workspace/ui/components/button"
import type { Attachment } from "../types/domain"

export interface ComposerAttachmentItem {
  key: string
  fileName: string
  status: "uploading" | "ready" | "error"
  attachment?: Attachment
  error?: string
}

export function ComposerAttachments({
  items,
  onRemove,
}: {
  items: ComposerAttachmentItem[]
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1 text-xs"
        >
          <bdi>{item.fileName}</bdi>
          {item.status === "uploading" && (
            <span role="status" className="text-muted-foreground">
              جارٍ الرفع
            </span>
          )}
          {item.status === "ready" && (
            <span className="sr-only">تم رفع الملف</span>
          )}
          {item.status === "error" && (
            <span role="alert" className="text-destructive">
              {item.error ?? "تعذر رفع الملف"}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`إزالة ${item.fileName}`}
            onClick={() => onRemove(item.key)}
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  )
}
