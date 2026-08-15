import type { Attachment } from "../types/domain"
export function MessageAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border bg-background/70 p-2 text-xs">
      <span className="font-medium">{attachment.kind}</span>
      <bdi className="truncate">{attachment.fileName}</bdi>
      {attachment.placeholder && (
        <span className="text-muted-foreground">معاينة فقط</span>
      )}
    </div>
  )
}
