import type { ComponentType } from "react"
import { Camera, MessagesSquare, MessageCircle } from "lucide-react"
import type { ChannelProvider, ChannelStatus } from "../types/domain"

export const providerLabels: Record<ChannelProvider, string> = {
  whatsapp: "واتساب",
  messenger: "فيسبوك ماسنجر",
  instagram: "إنستغرام",
}

export const providerIcons: Record<
  ChannelProvider,
  ComponentType<{ className?: string }>
> = {
  whatsapp: MessageCircle,
  messenger: MessagesSquare,
  instagram: Camera,
}

export const providerColors: Record<ChannelProvider, string> = {
  whatsapp: "text-emerald-600 dark:text-emerald-400",
  messenger: "text-blue-600 dark:text-blue-400",
  instagram: "text-pink-600 dark:text-pink-400",
}

export const statusLabels: Record<ChannelStatus, string> = {
  connected: "متصلة",
  disconnected: "مفصولة",
  error: "تحتاج مراجعة",
}

export const statusTone: Record<ChannelStatus, string> = {
  connected:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
  disconnected: "bg-muted text-muted-foreground ring-border",
  error: "bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20",
}
