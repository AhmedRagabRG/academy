"use client"

import { useState } from "react"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { feedback } from "@/shared/components/feedback/toast"
import { usePermission } from "@/shared/hooks/use-permission"
import { inboxPermissions } from "@/features/inbox/config/inbox-permissions"
import { useInboxLookups } from "@/features/inbox/hooks/use-inbox-list"
import { ChannelCard } from "../components/channel-card"
import { LinkChannelPanel } from "../components/link-channel-panel"
import { providerLabels } from "../config/channel-copy"
import { useChannels } from "../hooks/use-channels"
import type { ConnectChannelCommand, LinkingSession } from "../types/domain"

export function ChannelsScreen() {
  const canView = usePermission(inboxPermissions.viewChannels)
  const canManage = usePermission(inboxPermissions.manageChannels)
  const channels = useChannels()
  const lookups = useInboxLookups()
  const [session, setSession] = useState<LinkingSession | null>(null)

  if (!canView)
    return (
      <PageContainer>
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          ليس لديك صلاحية لعرض القنوات المرتبطة.
        </p>
      </PageContainer>
    )

  const overview = channels.overview.data
  const busy =
    channels.verify.isPending ||
    channels.disconnect.isPending ||
    channels.remove.isPending

  const fail = (error: Error) => feedback.error(error.message)

  return (
    <PageContainer className="max-w-none">
      <PageHeader
        title="قنوات الوارد"
        description="اربط حسابات واتساب وفيسبوك ماسنجر وإنستغرام حتى تصل رسائلها إلى صندوق الوارد وتُنشئ جهات اتصال وفرصًا تلقائيًا."
      />

      {channels.overview.isPending && (
        <p className="text-sm text-muted-foreground">جارٍ تحميل القنوات…</p>
      )}
      {channels.overview.error && (
        <p className="rounded-xl border bg-card p-6 text-sm text-red-600 dark:text-red-400">
          {(channels.overview.error as Error).message}
        </p>
      )}

      {overview && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-3">
            {overview.connections.length === 0 && (
              <p className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
                لا توجد قنوات مرتبطة بعد.
              </p>
            )}
            {overview.connections.map((connection) => (
              <ChannelCard
                key={connection.id}
                connection={connection}
                canManage={canManage}
                busy={busy}
                onVerify={() =>
                  channels.verify.mutate(connection.id, {
                    onSuccess: () => feedback.success("تم فحص الاتصال"),
                    onError: fail,
                  })
                }
                onDisconnect={() =>
                  channels.disconnect.mutate(connection.id, {
                    onSuccess: () => feedback.success("تم فصل القناة"),
                    onError: fail,
                  })
                }
                onRemove={() =>
                  channels.remove.mutate(connection.id, {
                    onSuccess: () => feedback.success("تم إلغاء الربط"),
                    onError: fail,
                  })
                }
              />
            ))}

            <section
              className="rounded-xl border bg-card p-4"
              aria-label="حالة القنوات"
            >
              <h3 className="font-medium">القنوات المدعومة</h3>
              <ul className="mt-3 grid gap-2 text-sm">
                {overview.available.map((channel) => (
                  <li
                    key={channel.provider}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>{providerLabels[channel.provider]}</span>
                    <span className="text-xs text-muted-foreground">
                      {channel.linked
                        ? "مرتبطة"
                        : channel.environmentFallback
                          ? "تعمل بإعدادات الخادم"
                          : "غير مرتبطة"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {canManage && (
            <LinkChannelPanel
              session={session}
              exchanging={channels.exchange.isPending}
              connecting={channels.connect.isPending}
              onExchange={(userAccessToken, wabaId) =>
                channels.exchange.mutate(
                  { userAccessToken, wabaId: wabaId || undefined },
                  {
                    onSuccess: (result) => {
                      setSession(result)
                      feedback.success("تم جلب الحسابات المتاحة")
                    },
                    onError: fail,
                  }
                )
              }
              onConnect={(command: ConnectChannelCommand) =>
                channels.connect.mutate(command, {
                  onSuccess: (connection) => {
                    setSession(null)
                    feedback.success(`تم ربط ${connection.displayName}`)
                  },
                  onError: fail,
                })
              }
            />
          )}
        </div>
      )}
    </PageContainer>
  )
}
