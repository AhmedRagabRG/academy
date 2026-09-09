"use client"

import { useMemo, useState } from "react"
import {
  FolderPlus,
  Search,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import type { Contact, ContactGroup } from "../types/domain"
import { ContactAvatar, SourceBadge } from "./contact-ui"

export function ContactGroups({
  contacts,
  groups,
  onCreate,
  onDelete,
  onToggleMember,
  allowed,
}: {
  contacts: Contact[]
  groups: ContactGroup[]
  onCreate: (name: string, description: string) => Promise<string>
  onDelete: (groupId: string) => Promise<void>
  onToggleMember: (contactId: string, groupId: string) => void
  allowed: boolean
}) {
  const [selectedId, setSelectedId] = useState(groups[0]?.id ?? null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [managingMembers, setManagingMembers] = useState(false)
  const [memberQuery, setMemberQuery] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const selected = groups.find((group) => group.id === selectedId)

  const handleDeleteGroup = async () => {
    if (!selected || deleting) return
    setDeleting(true)
    try {
      await onDelete(selected.id)
      const remaining = groups.filter((group) => group.id !== selected.id)
      setSelectedId(remaining[0]?.id ?? null)
      setManagingMembers(false)
      setMemberQuery("")
      setConfirmingDelete(false)
    } catch {
      // The caller already surfaced a toast; keep the confirmation open for retry.
    } finally {
      setDeleting(false)
    }
  }
  const members = useMemo(
    () =>
      contacts.filter((contact) => contact.groupIds.includes(selectedId ?? "")),
    [contacts, selectedId]
  )
  const availableContacts = useMemo(() => {
    const query = memberQuery.trim().toLocaleLowerCase("ar")
    if (!query) return contacts
    return contacts.filter((contact) =>
      [contact.name, contact.phone, contact.email, contact.company]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ar")
        .includes(query)
    )
  }, [contacts, memberQuery])

  return (
    <div className="grid min-h-[34rem] xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="border-b xl:border-e xl:border-b-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-medium">المجموعات</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {groups.length} مجموعات
            </p>
          </div>
          {allowed && (
            <Button
              variant="outline"
              size="icon"
              title="مجموعة جديدة"
              aria-label="مجموعة جديدة"
              onClick={() => setCreating((value) => !value)}
            >
              <FolderPlus aria-hidden />
            </Button>
          )}
        </div>
        {creating && (
          <form
            className="grid gap-3 border-b bg-muted/30 p-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (!name.trim()) return
              const groupId = await onCreate(name, description)
              if (!groupId) return
              setSelectedId(groupId)
              setManagingMembers(true)
              setName("")
              setDescription("")
              setCreating(false)
            }}
          >
            <label className="grid gap-1 text-xs font-medium">
              اسم المجموعة
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              وصف مختصر
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <Button type="submit" size="sm">
              إنشاء المجموعة
            </Button>
          </form>
        )}
        <div className="p-2">
          {groups.map((group) => {
            const count = contacts.filter((contact) =>
              contact.groupIds.includes(group.id)
            ).length
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setSelectedId(group.id)
                  setManagingMembers(false)
                  setMemberQuery("")
                  setConfirmingDelete(false)
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  selectedId === group.id
                    ? "bg-brand-blue/10 text-brand-navy dark:text-blue-100"
                    : "hover:bg-muted"
                )}
              >
                <span className="grid size-9 place-items-center rounded-lg bg-background text-brand-blue ring-1 ring-border">
                  <UsersRound className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {group.name}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {count} جهات
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>
      <section aria-live="polite">
        {selected ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-5">
              <div>
                <p className="text-xs font-medium text-brand-blue">
                  مجموعة اتصال
                </p>
                <h2 className="mt-1 text-lg font-medium text-brand-navy dark:text-foreground">
                  {selected.name}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selected.description || "لا يوجد وصف لهذه المجموعة."}
                </p>
              </div>
              {allowed && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={managingMembers ? "secondary" : "outline"}
                    onClick={() => {
                      setManagingMembers((value) => !value)
                      setMemberQuery("")
                      setConfirmingDelete(false)
                    }}
                  >
                    {managingMembers ? (
                      <X aria-hidden />
                    ) : (
                      <UserPlus aria-hidden />
                    )}
                    {managingMembers ? "إنهاء" : "إدارة الأعضاء"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`حذف مجموعة ${selected.name}`}
                    title="حذف المجموعة"
                    onClick={() => setConfirmingDelete((value) => !value)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              )}
            </header>
            {confirmingDelete && (
              <div className="border-b border-destructive/30 bg-destructive/5 px-5 py-4">
                <p className="text-sm font-medium">
                  حذف مجموعة &quot;{selected.name}&quot;؟
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  لن يؤثر هذا على جهات الاتصال نفسها، وستبقى بياناتها كما هي.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting}
                    onClick={handleDeleteGroup}
                  >
                    {deleting ? "جارٍ الحذف…" : "حذف"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleting}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
            {managingMembers && (
              <section
                aria-labelledby="member-picker-title"
                className="border-b bg-muted/25 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3
                      id="member-picker-title"
                      className="text-sm font-medium"
                    >
                      إضافة أو إزالة أعضاء
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      يتم حفظ التغييرات مباشرة في المجموعة.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground" data-numeric>
                    {members.length} أعضاء
                  </span>
                </div>
                <label className="relative mt-4 block">
                  <span className="sr-only">البحث عن جهة اتصال لإضافتها</span>
                  <Search
                    className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={memberQuery}
                    onChange={(event) => setMemberQuery(event.target.value)}
                    placeholder="ابحث بالاسم أو الهاتف…"
                    className="pe-10"
                  />
                </label>
                <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border bg-card">
                  {availableContacts.map((contact) => {
                    const included = contact.groupIds.includes(selected.id)
                    return (
                      <label
                        key={contact.id}
                        className="flex min-h-14 cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-brand-blue/[0.035]"
                      >
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() =>
                            onToggleMember(contact.id, selected.id)
                          }
                          className="size-4 accent-brand-blue"
                        />
                        <ContactAvatar contact={contact} size="sm" />
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm">
                            {contact.name}
                          </strong>
                          <span
                            dir="ltr"
                            className="block text-end text-xs text-muted-foreground"
                          >
                            {contact.phone}
                          </span>
                        </span>
                        <span className="text-xs font-medium text-brand-blue">
                          {included ? "عضو" : "إضافة"}
                        </span>
                      </label>
                    )
                  })}
                  {!availableContacts.length && (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      لا توجد جهة اتصال مطابقة.
                    </p>
                  )}
                </div>
              </section>
            )}
            <div className="divide-y">
              {members.map((contact) => (
                <article
                  key={contact.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <ContactAvatar contact={contact} size="sm" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">
                      {contact.name}
                    </strong>
                    <span
                      dir="ltr"
                      className="block text-end text-xs text-muted-foreground"
                    >
                      {contact.phone}
                    </span>
                  </span>
                  <SourceBadge source={contact.source} />
                </article>
              ))}
              {!members.length && (
                <div className="grid min-h-64 place-items-center p-6 text-center">
                  <div>
                    <UsersRound
                      className="mx-auto size-8 text-muted-foreground"
                      aria-hidden
                    />
                    <p className="mt-3 text-sm font-medium">المجموعة فارغة</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      أضف جهات من لوحة تفاصيل جهة الاتصال.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
            أنشئ أول مجموعة لتنظيم جهات الاتصال.
          </div>
        )}
      </section>
    </div>
  )
}
