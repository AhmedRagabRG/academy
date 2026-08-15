import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { inboxCopy } from "../config/inbox-copy"
export function InboxSearch({
  value,
  recent,
  onChange,
  onCommit,
}: {
  value: string
  recent: string[]
  onChange: (value: string) => void
  onCommit: () => void
}) {
  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">{inboxCopy.search}</span>
        <Input
          className="ps-16"
          value={value}
          placeholder={inboxCopy.search}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommit()
          }}
        />
        {value && (
          <Button
            size="xs"
            variant="ghost"
            className="absolute top-1.5 left-1.5"
            aria-label="مسح البحث"
            onClick={() => onChange("")}
          >
            مسح
          </Button>
        )}
      </label>
      {recent.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="عمليات البحث الأخيرة">
          {recent.map((item) => (
            <Button
              key={item}
              size="xs"
              variant="ghost"
              onClick={() => onChange(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
