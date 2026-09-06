"use client"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { providerLabels, statusLabels, statusTone } from "../config/channel-copy"
import type { ChannelConnection } from "../types/domain"

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—"

export function ChannelCard({
  connection,
  canManage,
  busy,
  onVerify,
  onDisconnect,
  onRemove,
}: {
  connection: ChannelConnection
  canManage: boolean
  busy: boolean
  onVerify: () => void
  onDisconnect: () => void
  onRemove: () => void
}) {
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">
            {connection.displayName}
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              {providerLabels[connection.provider]}
            </span>
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {connection.accountLabel ?? connection.providerAccountId}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium ring-1",
            statusTone[connection.status]
          )}
        >
          {statusLabels[connection.status]}
        </span>
      </div>

      {connection.lastError && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {connection.lastError}
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">آخر تحقق</dt>
          <dd data-numeric>{formatDate(connection.lastVerifiedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">آخر رسالة واردة</dt>
          <dd data-numeric>{formatDate(connection.lastInboundAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">انتهاء الرمز</dt>
          <dd data-numeric>{formatDate(connection.tokenExpiresAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">رَبَطَها</dt>
          <dd>{connection.connectedByName}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onVerify}
          disabled={busy}
        >
          فحص الاتصال
        </Button>
        {canManage && connection.status !== "disconnected" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDisconnect}
            disabled={busy}
          >
            فصل مؤقت
          </Button>
        )}
        {canManage && (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 dark:text-red-400"
            onClick={onRemove}
            disabled={busy}
          >
            إلغاء الربط
          </Button>
        )}
      </div>
    </article>
  )
}
