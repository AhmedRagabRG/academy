"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, type ChangeEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  Check,
  FileSpreadsheet,
  Link2Off,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Save,
  Send,
  Upload,
  UsersRound,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { PageContainer } from "@/shared/components/layout/page-container"
import { feedback } from "@/shared/components/feedback/toast"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { usePermission } from "@/shared/hooks/use-permission"
import { contactTokenLabel } from "../config/campaign-copy"
import { campaignsPermissions } from "../config/campaigns-permissions"
import {
  useCampaignDetail,
  useCampaignLookups,
  useCampaignMutations,
} from "../hooks/use-campaigns"
import { campaignsKeys } from "../services/campaigns-query-keys"
import { campaignsService } from "../services/active-campaigns-service"
import type {
  AudienceGroup,
  AudienceRow,
  CampaignDetail,
  CampaignDraft,
  CampaignLookups,
  VariableBinding,
  VariableSource,
  WhatsappTemplate,
} from "../types/domain"

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
const inputLabel =
  "mb-1.5 block text-sm font-medium text-brand-navy dark:text-foreground"

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let value = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"'
      index += 1
    } else if (character === '"') quoted = !quoted
    else if (character === "," && !quoted) {
      values.push(value.trim())
      value = ""
    } else value += character
  }
  values.push(value.trim())
  return values
}

function parseAudienceCsv(source: string): AudienceRow[] {
  const lines = source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim())
  if (!lines.length) return []
  const headings = parseCsvLine(lines[0]!).map((value) => value.toLowerCase())
  const aliases: Record<keyof AudienceRow, string[]> = {
    name: ["name", "الاسم", "الاسم الكامل"],
    phone: ["phone", "mobile", "الهاتف", "رقم الهاتف"],
    email: ["email", "البريد", "البريد الإلكتروني"],
    company: ["company", "الشركة", "الجهة"],
    role: ["role", "job title", "الصفة", "الوظيفة"],
  }
  const indexes = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      headings.findIndex((heading) => names.includes(heading)),
    ])
  ) as Record<keyof AudienceRow, number>
  const hasHeader = indexes.name >= 0 || indexes.phone >= 0
  const fallback: Record<keyof AudienceRow, number> = {
    name: 0,
    phone: 1,
    email: 2,
    company: 3,
    role: 4,
  }
  return lines.slice(hasHeader ? 1 : 0).map((line) => {
    const cells = parseCsvLine(line)
    const read = (key: keyof AudienceRow) =>
      cells[indexes[key] >= 0 ? indexes[key] : fallback[key]] ?? ""
    return {
      name: read("name"),
      phone: read("phone"),
      email: read("email"),
      company: read("company"),
      role: read("role"),
    }
  })
}

function makeBindings(count: number): VariableBinding[] {
  return Array.from({ length: count }, (_, index) => ({
    position: index + 1,
    source: "contact" as const,
    value: "name",
    fallback: "عميلنا العزيز",
  }))
}

function fillTemplate(text: string | undefined, bindings: VariableBinding[]) {
  if (!text) return undefined
  let result = text
  for (const binding of bindings) {
    const value =
      binding.source === "literal"
        ? binding.value || "نص ثابت"
        : binding.fallback || contactTokenLabel[binding.value] || "بيانات الجهة"
    result = result.replace(/\{\{[^}]+\}\}/, value)
  }
  return result
}

function BindingRows({
  title,
  bindings,
  tokens,
  customFields,
  onChange,
}: {
  title: string
  bindings: VariableBinding[]
  tokens: string[]
  customFields: { id: string; label: string }[]
  onChange: (bindings: VariableBinding[]) => void
}) {
  if (!tokens.length) return null
  const update = (position: number, patch: Partial<VariableBinding>) =>
    onChange(
      bindings.map((binding) =>
        binding.position === position ? { ...binding, ...patch } : binding
      )
    )
  return (
    <div className="mt-5">
      <h3 className="mb-2 font-heading text-sm font-medium text-brand-navy dark:text-foreground">
        {title}
      </h3>
      <div className="divide-y rounded-lg border">
        {bindings.map((binding, index) => (
          <div
            key={binding.position}
            className="grid gap-3 p-3 lg:grid-cols-[5rem_9rem_minmax(10rem,1fr)_minmax(10rem,1fr)] lg:items-end"
          >
            <div>
              <span className="text-xs text-muted-foreground">المتغير</span>
              <p
                className="mt-2 font-medium"
                dir="ltr"
              >{`{{${tokens[index] ?? binding.position}}}`}</p>
            </div>
            <label>
              <span className={inputLabel}>المصدر</span>
              <select
                className={selectClass}
                value={binding.source}
                onChange={(event) => {
                  const source = event.target.value as VariableSource
                  update(binding.position, {
                    source,
                    value:
                      source === "contact"
                        ? "name"
                        : source === "field"
                          ? (customFields[0]?.id ?? "")
                          : "",
                  })
                }}
              >
                <option value="contact">بيانات الجهة</option>
                <option value="field" disabled={!customFields.length}>
                  حقل مخصص
                </option>
                <option value="literal">نص ثابت</option>
              </select>
            </label>
            <label>
              <span className={inputLabel}>
                {binding.source === "literal" ? "النص" : "الحقل"}
              </span>
              {binding.source === "literal" ? (
                <Input
                  value={binding.value}
                  onChange={(event) =>
                    update(binding.position, { value: event.target.value })
                  }
                  placeholder="القيمة التي تظهر للجميع"
                />
              ) : (
                <select
                  className={selectClass}
                  value={binding.value}
                  onChange={(event) =>
                    update(binding.position, { value: event.target.value })
                  }
                >
                  {binding.source === "contact"
                    ? Object.entries(contactTokenLabel).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )
                    : customFields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.label}
                        </option>
                      ))}
                </select>
              )}
            </label>
            <label>
              <span className={inputLabel}>بديل عند الفراغ</span>
              <Input
                value={binding.fallback}
                disabled={binding.source === "literal"}
                onChange={(event) =>
                  update(binding.position, { fallback: event.target.value })
                }
                placeholder="مطلوب إذا كان الحقل قد يكون فارغًا"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function CampaignBuilderForm({
  campaignId,
  lookupData,
  existingCampaign,
}: {
  campaignId?: string
  lookupData: CampaignLookups
  existingCampaign?: CampaignDetail
}) {
  const router = useRouter()
  const canCreate = usePermission(campaignsPermissions.create)
  const canUpdate = usePermission(campaignsPermissions.update)
  const canLaunch = usePermission(campaignsPermissions.launch)
  const canSync = usePermission(campaignsPermissions.syncTemplates)
  const mutations = useCampaignMutations()
  const [name, setName] = useState(existingCampaign?.name ?? "")
  const [description, setDescription] = useState(
    existingCampaign?.description ?? ""
  )
  const [templateId, setTemplateId] = useState(
    existingCampaign?.template.id ?? ""
  )
  const [groupIds, setGroupIds] = useState<string[]>(
    existingCampaign?.groupIds ?? []
  )
  const [variables, setVariables] = useState<VariableBinding[]>(
    existingCampaign?.variables ?? []
  )
  const [headerVariables, setHeaderVariables] = useState<VariableBinding[]>(
    existingCampaign?.headerVariables ?? []
  )
  const [throttle, setThrottle] = useState(
    existingCampaign?.throttlePerMinute ?? 120
  )
  const [schedule, setSchedule] = useState(
    Boolean(existingCampaign?.scheduledAt)
  )
  const [scheduledAt, setScheduledAt] = useState(
    existingCampaign?.scheduledAt?.slice(0, 16) ?? ""
  )
  const [importedGroups, setImportedGroups] = useState<AudienceGroup[]>([])
  const [importing, setImporting] = useState(false)

  const groups = useMemo(() => {
    const merged = [...lookupData.groups, ...importedGroups]
    return [...new Map(merged.map((group) => [group.id, group])).values()]
  }, [importedGroups, lookupData.groups])
  const selectedTemplate =
    lookupData.templates.find((template) => template.id === templateId) ??
    existingCampaign?.template
  const audience = useQuery({
    queryKey: campaignsKeys.audience(groupIds),
    queryFn: ({ signal }) => campaignsService.previewAudience(groupIds, signal),
    enabled: groupIds.length > 0,
  })
  const allowed = campaignId ? canUpdate : canCreate
  const busy =
    mutations.create.isPending ||
    mutations.update.isPending ||
    mutations.launch.isPending

  const chooseTemplate = (template: WhatsappTemplate) => {
    setTemplateId(template.id)
    setVariables(makeBindings(template.variableTokens.length))
    setHeaderVariables(makeBindings(template.headerVariableTokens.length))
  }

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      setImporting(true)
      const rows = parseAudienceCsv(await file.text())
      if (!rows.length)
        throw new Error("الملف لا يحتوي على صفوف قابلة للاستيراد.")
      const groupName =
        file.name.replace(/\.csv$/i, "").trim() || "جمهور مستورد"
      const outcome = await mutations.importAudience.mutateAsync({
        name: groupName,
        rows,
      })
      setImportedGroups((current) => [...current, outcome.group])
      setGroupIds((current) => [...new Set([...current, outcome.group.id])])
      feedback.success(
        `تم استيراد ${outcome.imported.toLocaleString("ar-EG")} جهة وإضافتها للجمهور`
      )
    } catch (error) {
      feedback.error((error as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const save = async (launch: boolean) => {
    if (name.trim().length < 2)
      return feedback.error("أدخل اسمًا واضحًا للحملة.")
    if (!selectedTemplate) return feedback.error("اختر قالب واتساب معتمدًا.")
    if (launch && !groupIds.length)
      return feedback.error("اختر مجموعة واحدة على الأقل قبل الإطلاق.")
    if (variables.some((binding) => !binding.value.trim()))
      return feedback.error("أكمل ربط متغيرات نص الرسالة.")
    if (headerVariables.some((binding) => !binding.value.trim()))
      return feedback.error("أكمل ربط متغيرات الترويسة.")
    if (schedule && launch && !scheduledAt)
      return feedback.error("اختر موعد الإرسال.")
    const draft: CampaignDraft = {
      name,
      description,
      templateId: selectedTemplate.id,
      groupIds,
      variables,
      headerVariables,
      throttlePerMinute: throttle,
      scheduledAt:
        schedule && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : undefined,
    }
    try {
      const campaign = campaignId
        ? await mutations.update.mutateAsync({
            id: campaignId,
            draft,
            expectedVersion: existingCampaign?.version,
          })
        : await mutations.create.mutateAsync(draft)
      if (launch) {
        await mutations.launch.mutateAsync({
          id: campaign.id,
          scheduledAt:
            schedule && scheduledAt
              ? new Date(scheduledAt).toISOString()
              : undefined,
        })
        feedback.success(schedule ? "تمت جدولة الحملة" : "بدأ إرسال الحملة")
      } else feedback.success("تم حفظ مسودة الحملة")
      router.push(`/campaigns/${campaign.id}`)
    } catch (error) {
      feedback.error((error as Error).message)
    }
  }

  if (!allowed)
    return (
      <PageContainer>
        <ErrorState message="ليس لديك صلاحية لإنشاء هذه الحملة أو تعديلها." />
      </PageContainer>
    )
  return (
    <PageContainer className="max-w-none">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={campaignId ? `/campaigns/${campaignId}` : "/campaigns"}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-blue"
          >
            <ArrowRight className="size-4" aria-hidden />
            العودة إلى الحملات
          </Link>
          <span className="mb-3 block h-0.5 w-8 bg-brand-gold" aria-hidden />
          <h1 className="font-heading text-2xl font-medium text-brand-navy dark:text-foreground">
            {campaignId ? "تعديل الحملة" : "حملة واتساب جديدة"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            القالب والجمهور والمتغيرات في مسار واحد قبل الإرسال.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void save(false)}
          >
            <Save aria-hidden />
            حفظ كمسودة
          </Button>
          {canLaunch &&
            (!existingCampaign || existingCampaign.status === "draft") && (
              <Button disabled={busy} onClick={() => void save(true)}>
                {busy ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <Send aria-hidden />
                )}
                {schedule ? "حفظ وجدولة" : "حفظ وإطلاق"}
              </Button>
            )}
        </div>
      </header>

      {!lookupData.channel.linked && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          <p className="flex items-center gap-2 text-sm">
            <Link2Off className="size-4" aria-hidden />
            رقم واتساب للأعمال غير مهيأ على الخادم. تواصل مع فريق التقنية لإضافة
            بيانات الاعتماد قبل إطلاق الحملة.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section
            className="rounded-xl border bg-card p-5"
            aria-labelledby="campaign-basics"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-navy text-sm font-medium text-white">
                ١
              </span>
              <div>
                <h2
                  id="campaign-basics"
                  className="font-heading font-medium text-brand-navy dark:text-foreground"
                >
                  بيانات الحملة
                </h2>
                <p className="text-xs text-muted-foreground">
                  اسم داخلي يساعد الفريق على تمييزها.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className={inputLabel}>اسم الحملة</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={160}
                  placeholder="مثال: اليوم المفتوح — سبتمبر"
                />
              </label>
              <label className="md:col-span-2">
                <span className={inputLabel}>وصف اختياري</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  placeholder="هدف الحملة أو ملاحظة للفريق"
                />
              </label>
            </div>
          </section>

          <section
            className="rounded-xl border bg-card p-5"
            aria-labelledby="campaign-template"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-navy text-sm font-medium text-white">
                  ٢
                </span>
                <div>
                  <h2
                    id="campaign-template"
                    className="font-heading font-medium text-brand-navy dark:text-foreground"
                  >
                    القالب المعتمد
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    تظهر فقط القوالب المعتمدة من Meta.
                  </p>
                </div>
              </div>
              {canSync && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={mutations.syncTemplates.isPending}
                  onClick={() =>
                    mutations.syncTemplates.mutate(undefined, {
                      onSuccess: (result) =>
                        feedback.success(`تمت مزامنة ${result.synced} قالب`),
                      onError: (error) => feedback.error(error.message),
                    })
                  }
                >
                  <RefreshCw
                    className={cn(
                      mutations.syncTemplates.isPending && "animate-spin"
                    )}
                    aria-hidden
                  />
                  مزامنة القوالب
                </Button>
              )}
            </div>
            {lookupData.templates.length ? (
              <div className="grid gap-2 md:grid-cols-2">
                {lookupData.templates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => chooseTemplate(template)}
                    className={cn(
                      "relative rounded-lg border p-4 text-start transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      templateId === template.id
                        ? "border-brand-blue bg-brand-blue/[0.055]"
                        : "hover:border-brand-blue/50 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <MessageSquareText
                        className="size-5 text-brand-blue"
                        aria-hidden
                      />
                      {templateId === template.id && (
                        <span className="grid size-5 place-items-center rounded-full bg-brand-blue text-white">
                          <Check className="size-3" aria-hidden />
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-medium" dir="ltr">
                      {template.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {template.bodyText}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {template.language} · {template.category}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                لا توجد قوالب معتمدة بعد. اربط القناة ثم زامن القوالب.
              </p>
            )}
          </section>

          <section
            className="rounded-xl border bg-card p-5"
            aria-labelledby="campaign-audience"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-navy text-sm font-medium text-white">
                  ٣
                </span>
                <div>
                  <h2
                    id="campaign-audience"
                    className="font-heading font-medium text-brand-navy dark:text-foreground"
                  >
                    الجمهور
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    ادمج المجموعات بأمان؛ الرقم المكرر يُرسل له مرة واحدة.
                  </p>
                </div>
              </div>
              <label className="inline-flex cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => void importCsv(event)}
                  disabled={importing}
                />
                <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm hover:bg-muted">
                  {importing ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="size-4" aria-hidden />
                  )}
                  استيراد CSV
                </span>
              </label>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {groups.map((group) => {
                const checked = groupIds.includes(group.id)
                return (
                  <label
                    key={group.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      checked && "border-brand-blue bg-brand-blue/[0.045]"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() =>
                        setGroupIds((current) =>
                          checked
                            ? current.filter((id) => id !== group.id)
                            : [...current, group.id]
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{group.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {group.memberCount.toLocaleString("ar-EG")} جهة
                        {group.description ? ` · ${group.description}` : ""}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            {!groups.length && (
              <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                <FileSpreadsheet className="mx-auto mb-2 size-6" aria-hidden />
                أنشئ مجموعة من صفحة جهات الاتصال أو استورد ملف CSV هنا.
              </div>
            )}
            {groupIds.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-muted/55 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <UsersRound className="size-4 text-brand-blue" aria-hidden />
                  {audience.isPending
                    ? "جارٍ حساب الجمهور…"
                    : `${(audience.data?.total ?? 0).toLocaleString("ar-EG")} مستلم فريد`}
                </span>
                {Boolean(audience.data?.duplicates) && (
                  <span className="text-muted-foreground">
                    {audience.data?.duplicates.toLocaleString("ar-EG")} رقم مكرر
                    حُذف
                  </span>
                )}
                {Boolean(audience.data?.invalid) && (
                  <span className="text-amber-700 dark:text-amber-300">
                    {audience.data?.invalid.toLocaleString("ar-EG")} رقم غير
                    صالح
                  </span>
                )}
              </div>
            )}
          </section>

          <section
            className="rounded-xl border bg-card p-5"
            aria-labelledby="campaign-variables"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-navy text-sm font-medium text-white">
                ٤
              </span>
              <div>
                <h2
                  id="campaign-variables"
                  className="font-heading font-medium text-brand-navy dark:text-foreground"
                >
                  تخصيص المتغيرات
                </h2>
                <p className="text-xs text-muted-foreground">
                  اربط كل موضع ببيانات جهة الاتصال أو بنص ثابت.
                </p>
              </div>
            </div>
            {!selectedTemplate ? (
              <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                اختر القالب أولًا لعرض متغيراته.
              </p>
            ) : selectedTemplate.variableTokens.length +
                selectedTemplate.headerVariableTokens.length ===
              0 ? (
              <p className="rounded-lg bg-muted/50 p-4 text-sm">
                هذا القالب لا يحتوي على متغيرات.
              </p>
            ) : (
              <>
                <BindingRows
                  title="متغيرات الترويسة"
                  bindings={headerVariables}
                  tokens={selectedTemplate.headerVariableTokens}
                  customFields={lookupData.customFields}
                  onChange={setHeaderVariables}
                />
                <BindingRows
                  title="متغيرات نص الرسالة"
                  bindings={variables}
                  tokens={selectedTemplate.variableTokens}
                  customFields={lookupData.customFields}
                  onChange={setVariables}
                />
              </>
            )}
          </section>

          <section
            className="rounded-xl border bg-card p-5"
            aria-labelledby="campaign-delivery"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-navy text-sm font-medium text-white">
                ٥
              </span>
              <div>
                <h2
                  id="campaign-delivery"
                  className="font-heading font-medium text-brand-navy dark:text-foreground"
                >
                  الإرسال
                </h2>
                <p className="text-xs text-muted-foreground">
                  اضبط السرعة وأرسل الآن أو في موعد محدد.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className={inputLabel}>رسائل في الدقيقة</span>
                <Input
                  type="number"
                  min={6}
                  max={3000}
                  value={throttle}
                  onChange={(event) => setThrottle(Number(event.target.value))}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  الافتراضي ١٢٠. ارفعها تدريجيًا حسب مستوى رقمك لدى Meta.
                </span>
              </label>
              <div>
                <span className={inputLabel}>وقت الإرسال</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSchedule(false)}
                    className={cn(
                      "h-9 flex-1 rounded-lg border text-sm",
                      !schedule &&
                        "border-brand-blue bg-brand-blue/10 text-brand-navy dark:text-blue-100"
                    )}
                  >
                    الآن
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedule(true)}
                    className={cn(
                      "h-9 flex-1 rounded-lg border text-sm",
                      schedule &&
                        "border-brand-blue bg-brand-blue/10 text-brand-navy dark:text-blue-100"
                    )}
                  >
                    جدولة
                  </button>
                </div>
                {schedule && (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          </section>
        </div>

        <aside
          className="xl:sticky xl:top-6 xl:self-start"
          aria-label="معاينة رسالة واتساب"
        >
          <div className="overflow-hidden rounded-xl border bg-[#e8e4dc] shadow-[0_18px_50px_-35px_#0b2a4a] dark:bg-[#102b27]">
            <div className="bg-[#075e54] px-4 py-3 text-white">
              <p className="text-xs opacity-75">معاينة لمستلم نموذجي</p>
              <p className="mt-0.5 font-medium">WhatsApp Business</p>
            </div>
            <div className="min-h-72 p-4">
              <div className="max-w-[94%] rounded-lg rounded-tr-sm bg-[#dcf8c6] p-3 text-[#17312d] shadow-sm dark:bg-[#1f4f46] dark:text-emerald-50">
                {selectedTemplate ? (
                  <>
                    <p className="font-medium">
                      {fillTemplate(
                        selectedTemplate.headerText,
                        headerVariables
                      )}
                    </p>
                    <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">
                      {fillTemplate(selectedTemplate.bodyText, variables)}
                    </p>
                    {selectedTemplate.footerText && (
                      <p className="mt-2 text-xs opacity-65">
                        {selectedTemplate.footerText}
                      </p>
                    )}
                    <p className="mt-1 text-left text-[10px] opacity-60">
                      ١٠:٣٠ ✓✓
                    </p>
                  </>
                ) : (
                  <p className="text-sm opacity-70">
                    اختر قالبًا لمعاينة الرسالة هنا.
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border bg-card p-4 text-xs leading-5 text-muted-foreground">
            <p className="font-medium text-foreground">قبل الإطلاق</p>
            <ul className="mt-2 space-y-1">
              <li>• سيُرسل لكل رقم فريد مرة واحدة.</li>
              <li>• القيم الفارغة بلا بديل ستُستبعد.</li>
              <li>• يمكنك إيقاف الحملة واستئنافها بأمان.</li>
            </ul>
          </div>
        </aside>
      </div>
    </PageContainer>
  )
}

export function CampaignBuilderScreen({ campaignId }: { campaignId?: string }) {
  const lookups = useCampaignLookups()
  const existing = useCampaignDetail(
    campaignId ?? "",
    Boolean(campaignId),
    false
  )

  if (lookups.isPending || (campaignId && existing.isPending))
    return (
      <PageContainer>
        <LoadingState label="جارٍ تجهيز منشئ الحملة" />
      </PageContainer>
    )
  if (lookups.error || existing.error || !lookups.data)
    return (
      <PageContainer>
        <ErrorState
          message={
            ((lookups.error ?? existing.error) as Error | null)?.message ??
            "تعذر تجهيز منشئ الحملة"
          }
          onRetry={() => {
            void lookups.refetch()
            void existing.refetch()
          }}
        />
      </PageContainer>
    )

  return (
    <CampaignBuilderForm
      campaignId={campaignId}
      lookupData={lookups.data}
      existingCampaign={existing.data}
    />
  )
}
