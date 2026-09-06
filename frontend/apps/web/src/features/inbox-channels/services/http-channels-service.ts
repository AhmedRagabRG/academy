import { ApiError, httpClient } from "@/shared/api"
import type { ChannelsService } from "./channels-service"
import type {
  ChannelConnection,
  ChannelOverview,
  LinkingSession,
} from "../types/domain"

/**
 * Provider failures are surfaced verbatim: Meta's own wording ("this account is
 * already linked", "token expired") is far more actionable to whoever is doing
 * the linking than anything this layer could substitute.
 */
function toChannelError(error: unknown): Error {
  if (!(error instanceof ApiError))
    return new Error("تعذر إكمال الطلب. حاول مرة أخرى.")
  if (error.code === "oauth-not-configured")
    return new Error(
      "ربط Meta غير مهيأ على الخادم. أضف META_APP_ID و META_OAUTH_REDIRECT_URI."
    )
  if (error.code === "linking-session-expired")
    return new Error("انتهت جلسة الربط. ابدأ من جديد.")
  return new Error(error.message)
}

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw toChannelError(error)
  }
}

export const httpChannelsService: ChannelsService = {
  overview: (signal) =>
    guard(() =>
      httpClient.get<ChannelOverview>("/inbox/channels", undefined, signal)
    ),

  authorizationUrl: () =>
    guard(() =>
      httpClient.get<{ state: string; url: string }>("/inbox/channels/oauth/url")
    ),

  exchange: (input) =>
    guard(() =>
      httpClient.post<LinkingSession>("/inbox/channels/oauth/exchange", input)
    ),

  connect: (command) =>
    guard(() =>
      httpClient.post<ChannelConnection>("/inbox/channels", {
        ...command,
        subscribeWebhooks: true,
      })
    ),

  verify: (id) =>
    guard(() =>
      httpClient.post<ChannelConnection>(`/inbox/channels/${id}/verify`)
    ),

  disconnect: (id) =>
    guard(() =>
      httpClient.post<ChannelConnection>(`/inbox/channels/${id}/disconnect`)
    ),

  remove: (id) =>
    guard(async () => {
      await httpClient.delete<void>(`/inbox/channels/${id}`)
    }),
}
