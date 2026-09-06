import {
  Blocks,
  Building2,
  Contact,
  Gauge,
  KeyRound,
  MessagesSquare,
  Megaphone,
  Tickets,
  TrendingUp,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

export const iconRegistry = {
  dashboard: Gauge,
  foundation: Blocks,
  settings: Settings2,
  organization: Building2,
  users: UsersRound,
  roles: ShieldCheck,
  permissions: KeyRound,
  general: SlidersHorizontal,
  inbox: MessagesSquare,
  tickets: Tickets,
  contacts: Contact,
  pipeline: TrendingUp,
  campaigns: Megaphone,
} satisfies Record<string, LucideIcon>
export type NavigationIconKey = keyof typeof iconRegistry
