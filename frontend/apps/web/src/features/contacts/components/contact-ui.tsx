import type { LucideIcon } from "lucide-react"
import {
  Download,
  Camera,
  Globe,
  MessageCircle,
  MessagesSquare,
  Phone,
  Upload,
  UserRound,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import type { Contact, ContactSource } from "../types/domain"

const sourceMeta: Record<
  ContactSource,
  { label: string; icon: LucideIcon; className: string }
> = {
  whatsapp: {
    label: "واتساب",
    icon: MessageCircle,
    className:
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  instagram: {
    label: "إنستغرام",
    icon: Camera,
    className:
      "bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-200",
  },
  facebook: {
    label: "فيسبوك",
    icon: MessagesSquare,
    className:
      "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  },
  website: {
    label: "الموقع",
    icon: Globe,
    className: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  },
  phone: {
    label: "هاتف",
    icon: Phone,
    className:
      "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  },
  manual: {
    label: "يدوي",
    icon: UserRound,
    className: "bg-muted text-muted-foreground",
  },
  import: {
    label: "استيراد",
    icon: Upload,
    className:
      "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  },
}

export const allSources = Object.entries(sourceMeta) as [
  ContactSource,
  (typeof sourceMeta)[ContactSource],
][]

export function SourceBadge({ source }: { source: ContactSource }) {
  const meta = sourceMeta[source]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
        meta.className
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  )
}

export function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "name">
  size?: "sm" | "md" | "lg"
}) {
  const initials = contact.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand-blue/10 font-medium text-brand-blue ring-1 ring-brand-blue/15 dark:text-blue-200",
        size === "sm" && "size-9 text-xs",
        size === "md" && "size-11 text-sm",
        size === "lg" && "size-16 text-lg"
      )}
    >
      {initials}
    </span>
  )
}

export function ImportExportGlyph({ kind }: { kind: "import" | "export" }) {
  const Icon = kind === "import" ? Upload : Download
  return <Icon aria-hidden />
}

export function formatContactDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value))
}
