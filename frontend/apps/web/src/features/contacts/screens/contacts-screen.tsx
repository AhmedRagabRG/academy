"use client"

import { useState } from "react"
import {
  CheckCircle2,
  Grid2X2,
  List,
  Plus,
  Search,
  UsersRound,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { feedback } from "@/shared/components/feedback/toast"
import { usePermission } from "@/shared/hooks/use-permission"
import { contactsPermissions } from "../config/contacts-permissions"
import { useContactsWorkspace } from "../hooks/use-contacts-workspace"
import type { Contact, ContactDraft, ContactSource } from "../types/domain"
import { ContactList } from "../components/contact-list"
import { ContactDetailPanel } from "../components/contact-detail-panel"
import {
  CreateContactPanel,
  ImportContactsPanel,
} from "../components/contact-action-panels"
import { ContactGroups } from "../components/contact-groups"
import { allSources, ImportExportGlyph } from "../components/contact-ui"

type InspectorMode = "contact" | "create" | "import"

const escapeCsv = (value?: string) => `"${(value ?? "").replaceAll('"', '""')}"`

function download(csv: string) {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `alsalam-contacts-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

/** A hand-picked subset is written from the rows already on screen. */
function selectionCsv(contacts: Contact[]) {
  const header = ["الاسم", "الهاتف", "البريد", "الشركة", "الصفة", "المصدر"]
  const rows = contacts.map((contact) =>
    [
      contact.name,
      contact.phone,
      contact.email,
      contact.company,
      contact.role,
      contact.source,
    ]
      .map(escapeCsv)
      .join(",")
  )
  return [header.map(escapeCsv).join(","), ...rows].join("\n")
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let cell = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') quoted = !quoted
    else if (character === "," && !quoted) {
      cells.push(cell.trim())
      cell = ""
    } else cell += character
  }
  cells.push(cell.trim())
  return cells
}

function parseContactsCsv(csv: string): ContactDraft[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim())
  const first = parseCsvLine(lines[0] ?? "").map((value) => value.toLowerCase())
  type CsvField =
    "name" | "phone" | "secondaryPhone" | "email" | "company" | "role"
  const aliases: Record<CsvField, string[]> = {
    name: ["name", "الاسم", "الاسم الكامل"],
    phone: ["phone", "الهاتف", "رقم الهاتف"],
    secondaryPhone: ["secondaryphone", "هاتف آخر", "الهاتف الآخر"],
    email: ["email", "البريد", "البريد الإلكتروني"],
    company: ["company", "الشركة", "الجهة"],
    role: ["role", "الصفة", "الصفة الوظيفية"],
  }
  const indices = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      first.findIndex((heading) => names.includes(heading)),
    ])
  ) as Record<CsvField, number>
  const hasHeader = indices.name >= 0 || indices.phone >= 0
  const fallback: Record<CsvField, number> = {
    name: 0,
    phone: 1,
    email: 2,
    company: 3,
    role: 4,
    secondaryPhone: 5,
  }
  return lines.slice(hasHeader ? 1 : 0).map((line) => {
    const values = parseCsvLine(line)
    const read = (key: CsvField) =>
      values[indices[key] >= 0 ? indices[key] : fallback[key]] ?? ""
    return {
      name: read("name"),
      phone: read("phone"),
      email: read("email"),
      company: read("company"),
      role: read("role"),
      secondaryPhone: read("secondaryPhone"),
    }
  })
}

export function ContactsScreen({
  initialContactId,
  initialEditing = false,
}: {
  initialContactId?: string
  initialEditing?: boolean
} = {}) {
  const workspace = useContactsWorkspace(initialContactId)
  const [tab, setTab] = useState<"contacts" | "groups">("contacts")
  const [view, setView] = useState<"list" | "table">("list")
  const [inspector, setInspector] = useState<InspectorMode>("contact")
  const [mobilePane, setMobilePane] = useState<"list" | "details">("list")
  const canCreate = usePermission(contactsPermissions.create)
  const canImport = usePermission(contactsPermissions.import)
  const canExport = usePermission(contactsPermissions.export)
  const canManageGroups = usePermission(contactsPermissions.manageGroups)
  const canUpdate = usePermission(contactsPermissions.update)
  const canDelete = usePermission(contactsPermissions.delete)
  const canManageFields = usePermission(contactsPermissions.manageCustomFields)
  const canManageNotes = usePermission(contactsPermissions.manageNotes)

  const openInspector = (mode: InspectorMode) => {
    setTab("contacts")
    setInspector(mode)
    setMobilePane("details")
  }

  const exportable = workspace.selectedIds.length
    ? workspace.contacts.filter((contact) =>
        workspace.selectedIds.includes(contact.id)
      )
    : workspace.filteredContacts

  return (
    <PageContainer className="max-w-none">
      <PageHeader
        title="جهات الاتصال"
        description="سجل موحّد لكل من يتواصل مع الأكاديمية عبر القنوات المتصلة أو الإضافة المباشرة."
        actions={
          <>
            {canImport && (
              <Button variant="outline" onClick={() => openInspector("import")}>
                <ImportExportGlyph kind="import" />
                استيراد CSV
              </Button>
            )}
            {canExport && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    if (workspace.selectedIds.length) {
                      download(selectionCsv(exportable))
                      feedback.success(
                        `تم تجهيز ${exportable.length} جهة للتصدير`
                      )
                      return
                    }
                    download(await workspace.exportCsv())
                    feedback.success("تم تجهيز ملف التصدير")
                  } catch (error) {
                    feedback.error((error as Error).message)
                  }
                }}
              >
                <ImportExportGlyph kind="export" />
                تصدير
                {workspace.selectedIds.length
                  ? ` (${workspace.selectedIds.length})`
                  : ""}
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => openInspector("create")}>
                <Plus aria-hidden />
                إضافة جهة اتصال
              </Button>
            )}
          </>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_18px_50px_-42px_#0b2a4a]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4">
          <div
            role="tablist"
            aria-label="أقسام جهات الاتصال"
            className="flex gap-1"
          >
            <button
              role="tab"
              aria-selected={tab === "contacts"}
              onClick={() => setTab("contacts")}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                tab === "contacts"
                  ? "bg-brand-blue/10 text-brand-navy dark:text-blue-100"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <UsersRound className="size-4" aria-hidden />
              جهات الاتصال
              <span className="text-xs" data-numeric>
                {workspace.total}
              </span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "groups"}
              onClick={() => setTab("groups")}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                tab === "groups"
                  ? "bg-brand-blue/10 text-brand-navy dark:text-blue-100"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              المجموعات
              <span className="text-xs" data-numeric>
                {workspace.groups.length}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2
              className="size-4 text-emerald-600 dark:text-emerald-300"
              aria-hidden
            />
            مزامنة القنوات فعّالة
          </div>
        </div>

        {tab === "groups" ? (
          <ContactGroups
            contacts={workspace.contacts}
            groups={workspace.groups}
            allowed={canManageGroups}
            onCreate={async (name, description) => {
              if (!canManageGroups) return ""
              const group = await workspace.createGroup(name, description)
              feedback.success("تم إنشاء مجموعة الاتصال")
              return group.id
            }}
            onDelete={async (groupId) => {
              const name = workspace.groups.find(
                (group) => group.id === groupId
              )?.name
              try {
                await workspace.deleteGroup(groupId)
                feedback.success(
                  name ? `تم حذف مجموعة ${name}` : "تم حذف المجموعة"
                )
              } catch (error) {
                feedback.error((error as Error).message)
                throw error
              }
            }}
            onToggleMember={workspace.toggleGroup}
          />
        ) : (
          <div className="grid min-h-[34rem] xl:min-h-[calc(100dvh-15rem)] xl:grid-cols-[minmax(0,1fr)_23rem]">
            <section
              aria-label="قائمة جهات الاتصال"
              className={cn(
                "min-h-0",
                mobilePane === "list" ? "block" : "hidden xl:block"
              )}
            >
              <div className="border-b p-3 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <label className="relative min-w-0 flex-1">
                    <span className="sr-only">البحث في جهات الاتصال</span>
                    <Search
                      className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      value={workspace.query}
                      onChange={(event) =>
                        workspace.setQuery(event.target.value)
                      }
                      placeholder="ابحث بالاسم أو الهاتف أو البريد أو الشركة…"
                      className="pe-10"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="min-w-0 flex-1 md:flex-none">
                      <span className="sr-only">تصفية حسب المصدر</span>
                      <select
                        value={workspace.source}
                        onChange={(event) =>
                          workspace.setSource(
                            event.target.value as ContactSource | "all"
                          )
                        }
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm md:w-40"
                      >
                        <option value="all">كل المصادر</option>
                        {allSources.map(([value, meta]) => (
                          <option key={value} value={value}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div
                      className="flex rounded-lg border p-0.5"
                      aria-label="طريقة العرض"
                    >
                      <Button
                        size="icon-sm"
                        variant={view === "list" ? "secondary" : "ghost"}
                        aria-label="عرض القائمة"
                        aria-pressed={view === "list"}
                        onClick={() => setView("list")}
                      >
                        <List aria-hidden />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant={view === "table" ? "secondary" : "ghost"}
                        aria-label="عرض الجدول"
                        aria-pressed={view === "table"}
                        onClick={() => setView("table")}
                      >
                        <Grid2X2 aria-hidden />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex min-h-11 items-center justify-between border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
                <label className="inline-flex min-h-8 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      workspace.filteredContacts.length > 0 &&
                      workspace.filteredContacts.every((contact) =>
                        workspace.selectedIds.includes(contact.id)
                      )
                    }
                    onChange={workspace.toggleAllVisible}
                    className="size-4 accent-brand-blue"
                  />
                  تحديد الظاهر
                </label>
                <span data-numeric>
                  {workspace.selectedIds.length
                    ? `${workspace.selectedIds.length} محددة`
                    : `${workspace.filteredContacts.length} جهة`}
                </span>
              </div>
              <ContactList
                contacts={workspace.filteredContacts}
                selectedId={workspace.selectedContact?.id}
                selectedIds={workspace.selectedIds}
                view={view}
                onToggle={workspace.toggleSelected}
                onSelect={(id) => {
                  workspace.selectContact(id)
                  setInspector("contact")
                  setMobilePane("details")
                }}
              />
              {workspace.hasMore && (
                <div className="flex justify-center border-t p-3">
                  <Button
                    variant="outline"
                    onClick={workspace.loadMore}
                    disabled={workspace.isLoadingMore}
                  >
                    {workspace.isLoadingMore ? "جارٍ التحميل…" : "تحميل المزيد"}
                  </Button>
                </div>
              )}
            </section>

            <div
              className={cn(
                "min-h-0 border-t xl:block xl:border-s xl:border-t-0",
                mobilePane === "details" ? "block" : "hidden"
              )}
            >
              {inspector === "create" && (
                <CreateContactPanel
                  onBack={() => setMobilePane("list")}
                  onCreate={async (draft) => {
                    try {
                      const contact = await workspace.createContact(draft)
                      setInspector("contact")
                      feedback.success(`تمت إضافة ${contact.name}`)
                    } catch (error) {
                      feedback.error((error as Error).message)
                    }
                  }}
                />
              )}
              {inspector === "import" && (
                <ImportContactsPanel
                  onBack={() => setMobilePane("list")}
                  onFile={async (file) => {
                    const rows = parseContactsCsv(await file.text())
                    try {
                      const count = await workspace.importContacts(rows)
                      if (count)
                        feedback.success(`تم استيراد ${count} جهة اتصال`)
                      return count
                    } catch (error) {
                      feedback.error((error as Error).message)
                      return 0
                    }
                  }}
                />
              )}
              {inspector === "contact" && workspace.selectedContact && (
                <ContactDetailPanel
                  key={workspace.selectedContact.id}
                  contact={workspace.selectedContact}
                  groups={workspace.groups}
                  customFields={workspace.customFields}
                  owners={workspace.owners}
                  allowUpdate={canUpdate}
                  allowDelete={canDelete}
                  allowGroups={canManageGroups}
                  allowFields={canManageFields}
                  allowNotes={canManageNotes}
                  startEditing={
                    initialEditing &&
                    workspace.selectedContact.id === initialContactId
                  }
                  onBack={() => setMobilePane("list")}
                  onUpdate={async (draft) => {
                    try {
                      await workspace.updateContact(
                        workspace.selectedContact!.id,
                        draft,
                        workspace.selectedContact!.version
                      )
                      feedback.success("تم حفظ بيانات جهة الاتصال")
                    } catch (error) {
                      feedback.error((error as Error).message)
                    }
                  }}
                  onDelete={async () => {
                    const name = workspace.selectedContact!.name
                    try {
                      await workspace.removeContact(
                        workspace.selectedContact!.id
                      )
                      setMobilePane("list")
                      feedback.success(`تم حذف ${name}`)
                    } catch (error) {
                      feedback.error((error as Error).message)
                    }
                  }}
                  onAddNote={async (content) => {
                    try {
                      await workspace.addNote(
                        workspace.selectedContact!.id,
                        content
                      )
                      feedback.success("تمت إضافة الملاحظة")
                    } catch (error) {
                      feedback.error((error as Error).message)
                      throw error
                    }
                  }}
                  onToggleGroup={(groupId) =>
                    workspace.toggleGroup(
                      workspace.selectedContact!.id,
                      groupId
                    )
                  }
                  onCreateField={async (label, type) => {
                    try {
                      await workspace.createCustomField(label, type)
                      feedback.success("تمت إضافة الحقل المخصص")
                    } catch (error) {
                      feedback.error((error as Error).message)
                    }
                  }}
                  onCustomValue={(fieldId, value) =>
                    workspace.setCustomValue(
                      workspace.selectedContact!.id,
                      fieldId,
                      value
                    )
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
