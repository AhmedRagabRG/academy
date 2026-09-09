"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDeferredValue, useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  ArrowRight,
  CalendarClock,
  CheckCheck,
  Download,
  Edit3,
  Eye,
  HelpCircle,
  LoaderCircle,
  MessageSquareText,
  Pause,
  Play,
  Search,
  Send,
  Smartphone,
  Trash2,
  UsersRound,
  XCircle,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { PageContainer } from "@/shared/components/layout/page-container"
import { feedback } from "@/shared/components/feedback/toast"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { usePermission } from "@/shared/hooks/use-permission"
import {
  CampaignStatusBadge,
  RecipientStatusBadge,
} from "../components/campaign-status-badge"
import { recipientStatusLabel } from "../config/campaign-copy"
import { campaignsPermissions } from "../config/campaigns-permissions"
import {
  useCampaignDetail,
  useCampaignMutations,
  useCampaignPreview,
  useCampaignRecipients,
} from "../hooks/use-campaigns"
import { campaignsService } from "../services/active-campaigns-service"
import type { RecipientStatus } from "../types/domain"

function formatDate(value?: string) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function downloadCsv(csv: string, name: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${name}-recipients.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

const recipientFilters: Array<{
  value: RecipientStatus | "all"
  label: string
}> = [
  { value: "all", label: "الكل" },
  ...Object.entries(recipientStatusLabel).map(([value, label]) => ({
    value: value as RecipientStatus,
    label,
  })),
]

export function CampaignDetailScreen({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const detail = useCampaignDetail(campaignId)
  const preview = useCampaignPreview(campaignId)
  const actions = useCampaignMutations()
  const [search, setSearch] = useState("")
  const [recipientStatus, setRecipientStatus] = useState<
    RecipientStatus | "all"
  >("all")
  const [testPhone, setTestPhone] = useState("")
  const deferredSearch = useDeferredValue(search)
  const recipients = useCampaignRecipients(campaignId, {
    search: deferredSearch,
    status: recipientStatus,
    limit: 50,
  })
  const canUpdate = usePermission(campaignsPermissions.update)
  const canDelete = usePermission(campaignsPermissions.delete)
  const canLaunch = usePermission(campaignsPermissions.launch)
  const rows = useMemo(
    () => recipients.data?.pages.flatMap((page) => page.items) ?? [],
    [recipients.data]
  )
  const testSend = useMutation({
    mutationFn: () => campaignsService.testSend(campaignId, testPhone),
    onSuccess: () => feedback.success("أُرسلت الرسالة التجريبية بنجاح"),
    onError: (error) => feedback.error(error.message),
  })

  if (detail.isPending)
    return (
      <PageContainer>
        <LoadingState label="جارٍ تحميل الحملة" />
      </PageContainer>
    )
  if (detail.error || !detail.data)
    return (
      <PageContainer>
        <ErrorState
          message={(detail.error as Error)?.message ?? "الحملة غير موجودة"}
          onRetry={() => void detail.refetch()}
        />
      </PageContainer>
    )

  const campaign = detail.data
  const reached = campaign.stats.delivered + campaign.stats.read
  const deliveryRate = campaign.stats.total
    ? Math.round((reached / campaign.stats.total) * 100)
    : 0
  const busy =
    actions.launch.isPending ||
    actions.pause.isPending ||
    actions.resume.isPending ||
    actions.cancel.isPending ||
    actions.remove.isPending
  const act = async (operation: () => Promise<unknown>, message: string) => {
    try {
      await operation()
      feedback.success(message)
    } catch (error) {
      feedback.error((error as Error).message)
    }
  }

  return (
    <PageContainer className="max-w-none">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/campaigns"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-blue"
          >
            <ArrowRight className="size-4" aria-hidden />
            كل الحملات
          </Link>
          <span className="mb-3 block h-0.5 w-8 bg-brand-gold" aria-hidden />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-medium text-brand-navy dark:text-foreground">
              {campaign.name}
            </h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {campaign.description || `قالب ${campaign.template.name}`} · أنشأها{" "}
            {campaign.createdByName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate && campaign.status === "draft" && (
            <Button
              variant="outline"
              render={<Link href={`/campaigns/${campaign.id}/edit`} />}
            >
              <Edit3 aria-hidden />
              تعديل
            </Button>
          )}
          {canLaunch && campaign.status === "draft" && (
            <Button
              disabled={busy}
              onClick={() =>
                void act(
                  () => actions.launch.mutateAsync({ id: campaign.id }),
                  "بدأ إرسال الحملة"
                )
              }
            >
              <Send aria-hidden />
              إطلاق الآن
            </Button>
          )}
          {canLaunch && campaign.status === "running" && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void act(
                  () => actions.pause.mutateAsync(campaign.id),
                  "توقفت الحملة مؤقتًا"
                )
              }
            >
              <Pause aria-hidden />
              إيقاف مؤقت
            </Button>
          )}
          {canLaunch && campaign.status === "paused" && (
            <Button
              disabled={busy}
              onClick={() =>
                void act(
                  () => actions.resume.mutateAsync(campaign.id),
                  "استؤنف إرسال الحملة"
                )
              }
            >
              <Play aria-hidden />
              استئناف
            </Button>
          )}
          {canLaunch &&
            ["scheduled", "running", "paused"].includes(campaign.status) && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("هل تريد إلغاء ما تبقى من هذه الحملة؟"))
                    void act(
                      () => actions.cancel.mutateAsync(campaign.id),
                      "أُلغيت الحملة"
                    )
                }}
              >
                <XCircle aria-hidden />
                إلغاء
              </Button>
            )}
          {canDelete && !["running", "scheduled"].includes(campaign.status) && (
            <Button
              variant="ghost"
              disabled={busy}
              aria-label="حذف الحملة"
              onClick={() => {
                if (
                  window.confirm(
                    "سيُحذف سجل الحملة من القوائم. هل تريد المتابعة؟"
                  )
                )
                  void actions.remove
                    .mutateAsync(campaign.id)
                    .then(() => {
                      feedback.success("حُذفت الحملة")
                      router.push("/campaigns")
                    })
                    .catch((error: Error) => feedback.error(error.message))
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          )}
        </div>
      </header>

      {campaign.lastError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {campaign.lastError}
        </div>
      )}

      <section
        className="mb-6 grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 xl:grid-cols-6"
        aria-label="نتائج الحملة"
      >
        {[
          { label: "الجمهور", value: campaign.stats.total, icon: UsersRound },
          { label: "أُرسلت", value: campaign.stats.sent + reached, icon: Send },
          { label: "وصلت", value: reached, icon: CheckCheck },
          { label: "قُرئت", value: campaign.stats.read, icon: Eye },
          { label: "فشلت", value: campaign.stats.failed, icon: XCircle },
          {
            label: "غير مؤكدة",
            value: campaign.stats.uncertain,
            icon: HelpCircle,
          },
        ].map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-3 px-4 py-4",
              index > 0 && "border-t sm:border-s sm:border-t-0"
            )}
          >
            <item.icon className="size-5 text-brand-blue" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className="mt-1 font-heading text-xl font-medium text-brand-navy dark:text-foreground"
                data-numeric
              >
                {item.value.toLocaleString("ar-EG")}
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section
          className="rounded-xl border bg-card p-5"
          aria-labelledby="delivery-progress"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                id="delivery-progress"
                className="font-heading font-medium text-brand-navy dark:text-foreground"
              >
                تقدم الإرسال
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                تُحدّث الحالات تلقائيًا من إشعارات واتساب.
              </p>
            </div>
            <p
              className="font-heading text-3xl font-medium text-brand-navy dark:text-foreground"
              data-numeric
            >
              {deliveryRate}%
            </p>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-brand-blue transition-[width]"
              style={{ width: `${deliveryRate}%` }}
            />
          </div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">القالب</p>
              <p className="mt-1 font-medium" dir="ltr">
                {campaign.template.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">سرعة الإرسال</p>
              <p className="mt-1 font-medium" data-numeric>
                {campaign.throttlePerMinute.toLocaleString("ar-EG")} / دقيقة
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {campaign.status === "scheduled" ? "موعد الإرسال" : "بدأت"}
              </p>
              <p className="mt-1 font-medium">
                {formatDate(campaign.scheduledAt ?? campaign.startedAt)}
              </p>
            </div>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-xl border bg-[#e8e4dc] dark:bg-[#102b27]"
          aria-labelledby="message-preview"
        >
          <div className="flex items-center gap-2 bg-[#075e54] px-4 py-3 text-white">
            <MessageSquareText className="size-4" aria-hidden />
            <h2 id="message-preview" className="font-medium">
              معاينة الرسالة
            </h2>
          </div>
          <div className="p-4">
            <div className="rounded-lg rounded-tr-sm bg-[#dcf8c6] p-3 text-[#17312d] shadow-sm dark:bg-[#1f4f46] dark:text-emerald-50">
              {preview.isPending ? (
                <p className="text-sm">جارٍ تجهيز المعاينة…</p>
              ) : preview.data ? (
                <>
                  <p className="font-medium">{preview.data.header}</p>
                  <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">
                    {preview.data.body}
                  </p>
                  {preview.data.footer && (
                    <p className="mt-2 text-xs opacity-65">
                      {preview.data.footer}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm">تعذرت المعاينة.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section
        className="mb-6 overflow-hidden rounded-xl border bg-card"
        aria-labelledby="campaign-recipients"
      >
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2
              id="campaign-recipients"
              className="font-heading font-medium text-brand-navy dark:text-foreground"
            >
              المستلمون
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              كل رقم فريد وحالته الأخيرة لدى واتساب.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="الاسم أو الرقم"
                className="w-52 ps-9"
                aria-label="بحث المستلمين"
              />
            </div>
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={recipientStatus}
              onChange={(event) =>
                setRecipientStatus(
                  event.target.value as RecipientStatus | "all"
                )
              }
            >
              {recipientFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() =>
                void campaignsService
                  .exportRecipientsCsv(campaign.id)
                  .then((csv) => {
                    downloadCsv(csv, campaign.name)
                    feedback.success("تم تجهيز ملف المستلمين")
                  })
                  .catch((error: Error) => feedback.error(error.message))
              }
            >
              <Download aria-hidden />
              تصدير CSV
            </Button>
          </div>
        </div>
        {recipients.isPending ? (
          <LoadingState label="جارٍ تحميل المستلمين" />
        ) : recipients.error ? (
          <div className="p-4">
            <ErrorState
              message={(recipients.error as Error).message}
              onRetry={() => void recipients.refetch()}
            />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            لا توجد سجلات مطابقة بعد.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/55 text-brand-navy dark:text-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">المستلم</th>
                  <th className="px-4 py-3 text-start">الهاتف</th>
                  <th className="px-4 py-3 text-start">الحالة</th>
                  <th className="px-4 py-3 text-start">المحاولات</th>
                  <th className="px-4 py-3 text-start">آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((recipient) => (
                  <tr key={recipient.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{recipient.name}</td>
                    <td className="px-4 py-3" dir="ltr">
                      {recipient.phone}
                    </td>
                    <td className="px-4 py-3">
                      <RecipientStatusBadge status={recipient.status} />
                      {recipient.errorMessage && (
                        <p className="mt-1 max-w-xs text-xs text-red-600 dark:text-red-300">
                          {recipient.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3" data-numeric>
                      {recipient.attempts.toLocaleString("ar-EG")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(
                        recipient.readAt ??
                          recipient.deliveredAt ??
                          recipient.sentAt ??
                          recipient.failedAt ??
                          recipient.uncertainAt
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {recipients.hasNextPage && (
          <div className="border-t p-4 text-center">
            <Button
              variant="outline"
              disabled={recipients.isFetchingNextPage}
              onClick={() => void recipients.fetchNextPage()}
            >
              {recipients.isFetchingNextPage ? "جارٍ التحميل…" : "تحميل المزيد"}
            </Button>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          className="rounded-xl border bg-card p-5"
          aria-labelledby="test-send"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="size-5 text-brand-blue" aria-hidden />
            <h2
              id="test-send"
              className="font-heading font-medium text-brand-navy dark:text-foreground"
            >
              رسالة تجريبية
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            أرسل القالب بالقيم التجريبية إلى رقم واحد قبل الاعتماد على الحملة.
          </p>
          <div className="mt-4 flex gap-2" dir="ltr">
            <Input
              value={testPhone}
              onChange={(event) => setTestPhone(event.target.value)}
              placeholder="+201000000000"
              aria-label="رقم الاختبار"
            />
            <Button
              disabled={testSend.isPending || !testPhone.trim()}
              onClick={() => testSend.mutate()}
            >
              {testSend.isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
              إرسال
            </Button>
          </div>
        </section>
        <section
          className="rounded-xl border bg-card p-5"
          aria-labelledby="campaign-history"
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-brand-blue" aria-hidden />
            <h2
              id="campaign-history"
              className="font-heading font-medium text-brand-navy dark:text-foreground"
            >
              سجل الحملة
            </h2>
          </div>
          {campaign.events.length ? (
            <ol className="mt-4 space-y-3">
              {campaign.events.map((event) => (
                <li
                  key={event.id}
                  className="relative ps-5 text-sm before:absolute before:start-0 before:top-1.5 before:size-2 before:rounded-full before:bg-brand-gold"
                >
                  <p className="font-medium">{event.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.actorName} · {formatDate(event.occurredAt)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              لم تُسجل إجراءات إضافية بعد.
            </p>
          )}
        </section>
      </div>
    </PageContainer>
  )
}
