import type {
  ChannelConnection,
  ChannelOverview,
  ConnectChannelCommand,
  LinkingSession,
} from "../types/domain"

export interface ChannelsService {
  overview(signal?: AbortSignal): Promise<ChannelOverview>
  authorizationUrl(): Promise<{ state: string; url: string }>
  exchange(input: {
    code?: string
    userAccessToken?: string
    wabaId?: string
  }): Promise<LinkingSession>
  connect(command: ConnectChannelCommand): Promise<ChannelConnection>
  verify(id: string): Promise<ChannelConnection>
  disconnect(id: string): Promise<ChannelConnection>
  remove(id: string): Promise<void>
}
