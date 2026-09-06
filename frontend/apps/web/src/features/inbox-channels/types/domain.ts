export type ChannelProvider = "whatsapp" | "messenger" | "instagram"
export type ChannelStatus = "connected" | "disconnected" | "error"

export interface ChannelConnection {
  id: string
  provider: ChannelProvider
  platformId: string
  providerAccountId: string
  businessAccountId?: string
  displayName: string
  accountLabel?: string
  status: ChannelStatus
  scopes: string[]
  lastError?: string
  tokenExpiresAt?: string
  lastVerifiedAt?: string
  lastInboundAt?: string
  connectedByName: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface ChannelAvailability {
  provider: ChannelProvider
  label: string
  linked: boolean
  /** The channel still works from environment credentials, unlinked. */
  environmentFallback: boolean
}

export interface ChannelOverview {
  connections: ChannelConnection[]
  available: ChannelAvailability[]
  oauthConfigured: boolean
}

/** One account the operator can attach, offered after an OAuth exchange. */
export interface LinkableAsset {
  providerAccountId: string
  displayName: string
  accountLabel?: string
  businessAccountId?: string
}

export interface LinkingSession {
  sessionId: string
  expiresAt: string
  assets: Record<ChannelProvider, LinkableAsset[]>
}

export interface ConnectChannelCommand {
  provider: ChannelProvider
  providerAccountId: string
  sessionId?: string
  accessToken?: string
  businessAccountId?: string
  displayName?: string
}
