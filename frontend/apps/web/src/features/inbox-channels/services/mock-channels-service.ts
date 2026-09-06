import type { ChannelsService } from "./channels-service"
import type {
  ChannelConnection,
  ChannelProvider,
  ConnectChannelCommand,
  LinkingSession,
} from "../types/domain"
import { providerLabels } from "../config/channel-copy"

const clone = <T>(value: T): T => structuredClone(value)

let connections: ChannelConnection[] = [
  {
    id: "channel-whatsapp",
    provider: "whatsapp",
    platformId: "platform-whatsapp",
    providerAccountId: "990923474110740",
    displayName: "أكاديمية السلام",
    accountLabel: "+20 10 5555 0000",
    status: "connected",
    scopes: ["whatsapp_business_messaging"],
    lastVerifiedAt: "2026-08-31T09:00:00.000Z",
    lastInboundAt: "2026-08-31T18:40:00.000Z",
    connectedByName: "مدير النظام",
    version: 1,
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-31T09:00:00.000Z",
  },
]

const assets = (provider: ChannelProvider) => [
  {
    providerAccountId: `${provider}-demo-1`,
    displayName: `${providerLabels[provider]} التجريبي`,
    accountLabel: provider === "instagram" ? "@alsalam" : undefined,
    businessAccountId: "demo-business",
  },
]

export const mockChannelsService: ChannelsService = {
  overview: () =>
    Promise.resolve({
      connections: clone(connections),
      available: (
        ["whatsapp", "messenger", "instagram"] as ChannelProvider[]
      ).map((provider) => ({
        provider,
        label: providerLabels[provider],
        linked: connections.some((item) => item.provider === provider),
        // Messenger stands for the unlinked-but-env-configured case.
        environmentFallback: provider !== "instagram",
      })),
      oauthConfigured: true,
    }),

  authorizationUrl: () =>
    Promise.resolve({ state: "mock-state", url: "https://example.invalid/oauth" }),

  exchange: (): Promise<LinkingSession> =>
    Promise.resolve({
      sessionId: "mock-session",
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      assets: {
        whatsapp: assets("whatsapp"),
        messenger: assets("messenger"),
        instagram: assets("instagram"),
      },
    }),

  connect: (command: ConnectChannelCommand) => {
    const connection: ChannelConnection = {
      id: `channel-${command.provider}-${crypto.randomUUID()}`,
      provider: command.provider,
      platformId: `platform-${command.provider}`,
      providerAccountId: command.providerAccountId,
      businessAccountId: command.businessAccountId,
      displayName: command.displayName ?? providerLabels[command.provider],
      status: "connected",
      scopes: [],
      lastVerifiedAt: new Date().toISOString(),
      connectedByName: "مدير النظام",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    connections = [
      ...connections.filter((item) => item.provider !== command.provider),
      connection,
    ]
    return Promise.resolve(clone(connection))
  },

  verify: (id) => {
    const connection = connections.find((item) => item.id === id)
    if (!connection) return Promise.reject(new Error("القناة غير موجودة"))
    const next = {
      ...connection,
      status: "connected" as const,
      lastVerifiedAt: new Date().toISOString(),
    }
    connections = connections.map((item) => (item.id === id ? next : item))
    return Promise.resolve(clone(next))
  },

  disconnect: (id) => {
    const connection = connections.find((item) => item.id === id)
    if (!connection) return Promise.reject(new Error("القناة غير موجودة"))
    const next = { ...connection, status: "disconnected" as const }
    connections = connections.map((item) => (item.id === id ? next : item))
    return Promise.resolve(clone(next))
  },

  remove: (id) => {
    connections = connections.filter((item) => item.id !== id)
    return Promise.resolve()
  },
}
