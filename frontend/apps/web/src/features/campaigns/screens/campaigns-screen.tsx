"use client"

import Link from "next/link"
import { useDeferredValue, useMemo, useState } from "react"
import {
  ArrowLeft,
  CheckCheck,
  Clock3,
  Megaphone,
  Plus,
  Search,
  Send,
  UsersRound,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { usePermission } from "@/shared/hooks/use-permission"
import { CampaignStatusBadge } from "../components/campaign-status-badge"
import { campaignStatusLabel } from "../config/campaign-copy"
import { campaignsPermissions } from "../config/campaigns-permissions"
import { useCampaignList } from "../hooks/use-campaigns"
import type { Campaign, CampaignStatus } from "../types/domain"

const filters: Array<{ value: CampaignStatus | "all"; label: string }> = [
  { value: "all", label: "الكل" },
  ...Object.entries(campaignStatusLabel).map(([value, label]) => ({
    value: value as CampaignStatus,
    label,
  })),
]

function formatDate(value?: string) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function deliveryRate(campaign: Campaign) {
  if (!campaign.stats.total) return 0
  return Math.round(
    ((campaign.stats.delivered + campaign.stats.read) / campaign.stats.total) *
      100
  )
}

export function CampaignsScreen() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<CampaignStatus | "all">("all")
  const deferredSearch = useDeferredValue(search)
  const canCreate = usePermission(campaignsPermissions.create)
  const query = useCampaignList({ search: deferredSearch, status, limit: 25 })
  const campaigns = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  )
  const total = query.data?.pages[0]?.total ?? 0
  const summary = useMemo(
    () => ({
      active: campaigns.filter((item) => item.status === "running").length,
      audience: campaigns.reduce((sum, item) => sum + item.stats.total, 0),
      delivered: campaigns.reduce(
        (sum, item) => sum + item.stats.delivered + item.stats.read,
        0
      ),
    }),
    [campaigns]
  )

  return (
    <PageContainer className="max-w-none">
      <PageHeader
        title="حملات واتساب"
        description="أنشئ رسائل جماعية آمنة من قوالب Meta المعتمدة، وحدد الجمهور، ثم تابع الوصول والقراءة لحظة بلحظة."
        actions={
          canCreate ? (
            <Button render={<Link href="/campaigns/create" />}>
              <Plus aria-hidden />
              حملة جديدة
            </Button>
          ) : undefined
        }
      />

      <section
        className="mb-6 grid overflow-hidden rounded-xl border bg-card md:grid-cols-3"
        aria-label="ملخص الحملات"
      >
        {[
          { label: "حملات نشطة", value: summary.active, icon: Send },
          {
            label: "إجمالي الجمهور الظاهر",
            value: summary.audience,
            icon: UsersRound,
          },
          {
            label: "رسائل وصلت أو قُرئت",
            value: summary.delivered,
            icon: CheckCheck,
          },
        ].map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-4 px-5 py-4",
              index > 0 && "border-t md:border-s md:border-t-0"
            )}
          >
            <item.icon className="size-5 text-brand-blue" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className="mt-1 font-heading text-2xl font-medium text-brand-navy dark:text-foreground"
                data-numeric
              >
                {item.value.toLocaleString("ar-EG")}
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_18px_50px_-42px_#0b2a4a]">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم الحملة أو القالب"
              className="ps-9"
              aria-label="بحث الحملات"
            />
          </div>
          <div
            className="flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="تصفية حالة الحملة"
          >
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={status === filter.value}
                onClick={() => setStatus(filter.value)}
                className={cn(
                  "min-h-9 shrink-0 rounded-lg px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  status === filter.value
                    ? "bg-brand-navy text-white dark:bg-brand-blue"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {query.isPending ? (
          <LoadingState label="جارٍ تحميل الحملات" />
        ) : query.error ? (
          <div className="p-4">
            <ErrorState
              message={(query.error as Error).message}
              onRetry={() => void query.refetch()}
            />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="لا توجد حملات بهذه المواصفات"
            description="ابدأ بحملة جديدة أو غيّر كلمات البحث والتصفية."
          />
        ) : (
          <div className="divide-y">
            {campaigns.map((campaign) => {
              const rate = deliveryRate(campaign)
              return (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="group grid gap-4 px-4 py-4 transition-colors hover:bg-brand-blue/[0.035] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset md:grid-cols-[minmax(14rem,1.3fr)_minmax(11rem,0.9fr)_minmax(12rem,1fr)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Megaphone
                        className="size-4 text-brand-blue"
                        aria-hidden
                      />
                      <h2 className="truncate font-heading font-medium text-brand-navy group-hover:text-brand-blue dark:text-foreground">
                        {campaign.name}
                      </h2>
                      <CampaignStatusBadge status={campaign.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {campaign.template.name} · {campaign.template.language}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">الجمهور</p>
                    <p className="mt-1 font-medium" data-numeric>
                      {campaign.stats.total.toLocaleString("ar-EG")} مستلم
                    </p>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">الوصول</span>
                      <span data-numeric>{rate}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-brand-blue"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" aria-hidden />
                      {formatDate(
                        campaign.startedAt ??
                          campaign.scheduledAt ??
                          campaign.createdAt
                      )}
                    </p>
                  </div>
                  <ArrowLeft
                    className="hidden size-4 text-muted-foreground transition-transform group-hover:-translate-x-1 md:block"
                    aria-hidden
                  />
                </Link>
              )
            })}
          </div>
        )}

        {query.hasNextPage && (
          <div className="border-t p-4 text-center">
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage
                ? "جارٍ التحميل…"
                : `تحميل المزيد · ${total.toLocaleString("ar-EG")} حملة`}
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
