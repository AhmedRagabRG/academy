"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  providerColors,
  providerIcons,
  providerLabels,
} from "../config/channel-copy"
import type {
  ChannelProvider,
  ConnectChannelCommand,
  LinkingSession,
} from "../types/domain"

/**
 * Connects a social channel to the inbox.
 *
 * It offers two modes: a guided OAuth exchange that queries Meta for the
 * accounts the user has access to, and a manual token entry. The manual entry
 * is for operators who already generated a system-user token in Meta Business
 * Manager — which is how a single-tenant WhatsApp number is usually set up —
 * pastes the token and the account id instead.
 */
export function LinkChannelPanel({
  session,
  exchanging,
  connecting,
  onExchange,
  onConnect,
}: {
  session: LinkingSession | null
  exchanging: boolean
  connecting: boolean
  onExchange: (userAccessToken: string, wabaId: string) => void
  onConnect: (command: ConnectChannelCommand) => void
}) {
  const [mode, setMode] = useState<"oauth" | "token">("oauth")
  const [provider, setProvider] = useState<ChannelProvider>("whatsapp")
  const [userAccessToken, setUserAccessToken] = useState("")
  const [wabaId, setWabaId] = useState("")
  const [assetId, setAssetId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [providerAccountId, setProviderAccountId] = useState("")
  const [businessAccountId, setBusinessAccountId] = useState("")

  const offered = session?.assets[provider] ?? []

  return (
    <section
      aria-labelledby="link-channel-heading"
      className="rounded-xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="link-channel-heading" className="font-medium">
            ربط قناة جديدة
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            استقبل الرسائل في صندوق الوارد الموحد وأرسل الردود مباشرة.
          </p>
        </div>
        <div role="tablist" className="flex rounded-lg border p-0.5 text-xs">
          <button
            role="tab"
            type="button"
            aria-selected={mode === "oauth"}
            onClick={() => setMode("oauth")}
            className={`rounded-md px-2.5 py-1 ${
              mode === "oauth" ? "bg-muted font-medium" : "text-muted-foreground"
            }`}
          >
            المساعد التفاعلي
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={mode === "token"}
            onClick={() => setMode("token")}
            className={`rounded-md px-2.5 py-1 ${
              mode === "token" ? "bg-muted font-medium" : "text-muted-foreground"
            }`}
          >
            برمز وصول جاهز
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          aria-label="القناة"
          value={provider}
          onChange={(event) => {
            setProvider(event.target.value as ChannelProvider)
            setAssetId("")
          }}
          className="sr-only"
        >
          <option value="whatsapp">واتساب</option>
          <option value="messenger">فيسبوك ماسنجر</option>
          <option value="instagram">إنستغرام</option>
        </select>
        {(["whatsapp", "messenger", "instagram"] as ChannelProvider[]).map(
          (item) => {
            const Icon = providerIcons[item]
            const active = provider === item
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setProvider(item)
                  setAssetId("")
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-brand-blue bg-brand-blue/10 text-brand-navy dark:text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className={`size-4 ${providerColors[item]}`} aria-hidden />
                {providerLabels[item]}
              </button>
            )
          }
        )}
      </div>

      {mode === "oauth" ? (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-xs font-medium">
            رمز وصول المستخدم (من Meta Graph API Explorer أو نافذة الربط)
            <Input
              value={userAccessToken}
              onChange={(event) => setUserAccessToken(event.target.value)}
              placeholder="EAAB…"
            />
          </label>
          {provider === "whatsapp" && (
            <label className="grid gap-1 text-xs font-medium">
              معرّف حساب واتساب للأعمال (اختياري)
              <Input
                value={wabaId}
                onChange={(event) => setWabaId(event.target.value)}
                placeholder="1029384756…"
              />
            </label>
          )}
          <Button
            variant="outline"
            disabled={!userAccessToken.trim() || exchanging}
            onClick={() => onExchange(userAccessToken.trim(), wabaId.trim())}
          >
            {exchanging ? "جارٍ جلب الحسابات…" : "جلب الحسابات المتاحة"}
          </Button>

          {session && (
            <>
              <label className="grid gap-1 text-xs font-medium">
                الحساب المطلوب ربطه
                <select
                  aria-label="الحساب"
                  value={assetId}
                  onChange={(event) => setAssetId(event.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">اختر حسابًا…</option>
                  {offered.map((asset) => (
                    <option
                      key={asset.providerAccountId}
                      value={asset.providerAccountId}
                    >
                      {asset.displayName}
                      {asset.accountLabel ? ` · ${asset.accountLabel}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {offered.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  لا توجد حسابات {providerLabels[provider]} متاحة لهذا الرمز.
                </p>
              )}
              <Button
                disabled={!assetId || connecting}
                onClick={() => {
                  const asset = offered.find(
                    (item) => item.providerAccountId === assetId
                  )
                  if (!asset) return
                  onConnect({
                    provider,
                    providerAccountId: asset.providerAccountId,
                    sessionId: session.sessionId,
                    businessAccountId: asset.businessAccountId,
                    displayName: asset.displayName,
                  })
                }}
              >
                {connecting ? "جارٍ الربط…" : "ربط الحساب"}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-xs font-medium">
            معرّف الحساب لدى المزوّد
            <Input
              value={providerAccountId}
              onChange={(event) => setProviderAccountId(event.target.value)}
              placeholder={
                provider === "whatsapp" ? "Phone number ID" : "Page / IG ID"
              }
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            رمز الوصول
            <Input
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder="EAA…"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            {provider === "whatsapp"
              ? "معرّف حساب واتساب للأعمال"
              : "معرّف الصفحة المالكة (لإنستغرام)"}
            <Input
              value={businessAccountId}
              onChange={(event) => setBusinessAccountId(event.target.value)}
            />
          </label>
          <Button
            disabled={
              !providerAccountId.trim() ||
              !accessToken.trim() ||
              connecting
            }
            onClick={() =>
              onConnect({
                provider,
                providerAccountId: providerAccountId.trim(),
                accessToken: accessToken.trim(),
                businessAccountId: businessAccountId.trim() || undefined,
              })
            }
          >
            {connecting ? "جارٍ الربط…" : "ربط الحساب"}
          </Button>
        </div>
      )}
    </section>
  )
}
