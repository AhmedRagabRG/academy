"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  Mail,
  MessageSquareText,
  Pencil,
  Phone,
  Plus,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import type {
  Contact,
  ContactDraft,
  ContactGroup,
  CustomFieldDefinition,
  CustomFieldType,
} from "../types/domain"
import { ContactAvatar, formatContactDate, SourceBadge } from "./contact-ui"

interface ContactDetailPanelProps {
  contact: Contact
  groups: ContactGroup[]
  customFields: CustomFieldDefinition[]
  owners: { id: string; label: string }[]
  onBack: () => void
  onUpdate: (draft: ContactDraft) => void
  onDelete: () => void
  onAddNote: (content: string) => void
  onToggleGroup: (groupId: string) => void
  onCreateField: (label: string, type: CustomFieldType) => void
  onCustomValue: (fieldId: string, value: string) => void
  allowUpdate: boolean
  allowDelete: boolean
  allowGroups: boolean
  allowFields: boolean
  allowNotes: boolean
  startEditing?: boolean
}

const draftOf = (contact: Contact): ContactDraft => ({
  name: contact.name,
  phone: contact.phone,
  email: contact.email ?? "",
  company: contact.company ?? "",
  role: contact.role ?? "",
  secondaryPhone: contact.secondaryPhone ?? "",
  ownerAccountId: contact.ownerAccountId,
})

function DetailRow({
  icon: Icon,
  label,
  value,
  ltr,
}: {
  icon: typeof UserRound
  label: string
  value?: string
  ltr?: boolean
}) {
  return (
    <div className="grid grid-cols-[1.25rem_6.5rem_minmax(0,1fr)] items-start gap-2 py-2.5 text-sm">
      <Icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        dir={ltr ? "ltr" : undefined}
        className={cn("min-w-0 break-words", ltr && "text-end")}
      >
        {value || <span className="text-muted-foreground">غير مضاف</span>}
      </dd>
    </div>
  )
}

function EditContactForm({
  contact,
  owners,
  onSave,
  onCancel,
}: {
  contact: Contact
  owners: { id: string; label: string }[]
  onSave: (draft: ContactDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(() => draftOf(contact))
  const update = (key: keyof ContactDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))
  return (
    <form
      className="space-y-4 p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (draft.name.trim() && draft.phone.trim()) onSave(draft)
      }}
    >
      <div>
        <h3 className="text-sm font-medium">البيانات الأساسية</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          حدّث بيانات التواصل والمسؤول عن المتابعة.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {(
          [
            ["name", "الاسم", false],
            ["phone", "رقم الهاتف", true],
            ["email", "البريد الإلكتروني", true],
            ["company", "الشركة", false],
            ["role", "الصفة الوظيفية", false],
            ["secondaryPhone", "هاتف آخر", true],
          ] as const
        ).map(([key, label, ltr]) => (
          <label key={key} className="grid gap-1.5 text-sm">
            <span className="font-medium">{label}</span>
            <Input
              required={key === "name" || key === "phone"}
              dir={ltr ? "ltr" : undefined}
              value={draft[key] ?? ""}
              onChange={(event) => update(key, event.target.value)}
            />
          </label>
        ))}
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">المسؤول</span>
          <select
            value={draft.ownerAccountId ?? ""}
            onChange={(event) => update("ownerAccountId", event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {!contact.ownerAccountId && (
              <option value="">{contact.ownerName}</option>
            )}
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit">حفظ التعديلات</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}

export function ContactDetailPanel({
  contact,
  groups,
  customFields,
  owners,
  onBack,
  onUpdate,
  onDelete,
  onAddNote,
  onToggleGroup,
  onCreateField,
  onCustomValue,
  allowUpdate,
  allowDelete,
  allowGroups,
  allowFields,
  allowNotes,
  startEditing = false,
}: ContactDetailPanelProps) {
  const [editing, setEditing] = useState(startEditing)
  const [note, setNote] = useState("")
  const [addingField, setAddingField] = useState(false)
  const [fieldLabel, setFieldLabel] = useState("")
  const [fieldType, setFieldType] = useState<CustomFieldType>("text")
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <aside
      aria-label={`تفاصيل ${contact.name}`}
      className="min-h-0 overflow-y-auto bg-card"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur-sm xl:hidden">
        <Button variant="ghost" onClick={onBack}>
          <ArrowRight aria-hidden />
          القائمة
        </Button>
        <span className="text-sm font-medium">تفاصيل جهة الاتصال</span>
      </div>

      <header className="border-b px-5 py-6 text-center">
        <div className="flex justify-center">
          <ContactAvatar contact={contact} size="lg" />
        </div>
        <h2 className="mt-3 text-lg font-medium text-brand-navy dark:text-foreground">
          {contact.name}
        </h2>
        <div className="mt-2 flex justify-center">
          <SourceBadge source={contact.source} />
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href={`/inbox?contact=${contact.id}`}
            aria-label={`مراسلة ${contact.name}`}
            title="مراسلة"
            className={buttonVariants({ variant: "outline", size: "icon-lg" })}
          >
            <MessageSquareText aria-hidden />
          </Link>
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            aria-label={`الاتصال بـ ${contact.name}`}
            title="اتصال"
            className={buttonVariants({ variant: "outline", size: "icon-lg" })}
          >
            <Phone aria-hidden />
          </a>
          {allowUpdate && (
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="تعديل جهة الاتصال"
              title="تعديل"
              onClick={() => setEditing((value) => !value)}
            >
              <Pencil aria-hidden />
            </Button>
          )}
        </div>
      </header>

      {editing ? (
        <EditContactForm
          key={contact.id}
          contact={contact}
          owners={owners}
          onCancel={() => setEditing(false)}
          onSave={(draft) => {
            onUpdate(draft)
            setEditing(false)
          }}
        />
      ) : (
        <>
          <section
            className="border-b px-5 py-4"
            aria-labelledby="contact-data-title"
          >
            <h3 id="contact-data-title" className="text-sm font-medium">
              البيانات الأساسية
            </h3>
            <dl className="mt-2 divide-y">
              <DetailRow icon={UserRound} label="الاسم" value={contact.name} />
              <DetailRow
                icon={Building2}
                label="الشركة"
                value={contact.company}
              />
              <DetailRow icon={Briefcase} label="الصفة" value={contact.role} />
              <DetailRow
                icon={Phone}
                label="الهاتف"
                value={contact.phone}
                ltr
              />
              <DetailRow icon={Mail} label="البريد" value={contact.email} ltr />
              <DetailRow
                icon={Phone}
                label="هاتف آخر"
                value={contact.secondaryPhone}
                ltr
              />
              <DetailRow
                icon={UserRound}
                label="المسؤول"
                value={contact.ownerName}
              />
              <DetailRow
                icon={CalendarDays}
                label="تاريخ الإضافة"
                value={formatContactDate(contact.createdAt)}
              />
            </dl>
          </section>

          <section
            className="border-b px-5 py-4"
            aria-labelledby="groups-title"
          >
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-muted-foreground" aria-hidden />
              <h3 id="groups-title" className="text-sm font-medium">
                المجموعات
              </h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {groups.map((group) => {
                const checked = contact.groupIds.includes(group.id)
                return (
                  <label
                    key={group.id}
                    className={cn(
                      "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-xs transition-colors",
                      checked
                        ? "border-brand-blue/30 bg-brand-blue/10 text-brand-navy dark:text-blue-100"
                        : "hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!allowGroups}
                      onChange={() => onToggleGroup(group.id)}
                      className="accent-brand-blue"
                    />
                    {group.name}
                  </label>
                )
              })}
            </div>
          </section>

          <section
            className="border-b px-5 py-4"
            aria-labelledby="custom-fields-title"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 id="custom-fields-title" className="text-sm font-medium">
                الحقول المخصصة
              </h3>
              {allowFields && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingField((value) => !value)}
                >
                  <Plus aria-hidden />
                  حقل جديد
                </Button>
              )}
            </div>
            {addingField && (
              <form
                className="mt-3 grid gap-2 rounded-lg bg-muted/45 p-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!fieldLabel.trim()) return
                  onCreateField(fieldLabel, fieldType)
                  setFieldLabel("")
                  setAddingField(false)
                }}
              >
                <label className="grid gap-1 text-xs font-medium">
                  اسم الحقل
                  <Input
                    value={fieldLabel}
                    onChange={(event) => setFieldLabel(event.target.value)}
                    placeholder="مثال: موعد التواصل المناسب"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  النوع
                  <select
                    value={fieldType}
                    onChange={(event) =>
                      setFieldType(event.target.value as CustomFieldType)
                    }
                    className="h-10 rounded-lg border border-input bg-background px-3"
                  >
                    <option value="text">نص</option>
                    <option value="number">رقم</option>
                    <option value="date">تاريخ</option>
                  </select>
                </label>
                <Button type="submit" size="sm">
                  إضافة الحقل
                </Button>
              </form>
            )}
            <div className="mt-3 space-y-3">
              {customFields.map((field) => (
                <label key={field.id} className="grid gap-1.5 text-xs">
                  <span className="text-muted-foreground">{field.label}</span>
                  <Input
                    key={`${contact.id}-${field.id}`}
                    type={field.type}
                    disabled={!allowFields}
                    defaultValue={contact.customValues[field.id] ?? ""}
                    onBlur={(event) =>
                      onCustomValue(field.id, event.target.value)
                    }
                    placeholder="غير مضاف"
                  />
                </label>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="px-5 py-4" aria-labelledby="contact-notes-title">
        <div className="flex items-center justify-between">
          <h3 id="contact-notes-title" className="text-sm font-medium">
            الملاحظات
          </h3>
          <span className="text-xs text-muted-foreground">
            {contact.notes.length}
          </span>
        </div>
        {allowNotes && (
          <form
            className="mt-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!note.trim()) return
              onAddNote(note)
              setNote("")
            }}
          >
            <label htmlFor="contact-note" className="sr-only">
              ملاحظة جديدة
            </label>
            <textarea
              id="contact-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="اكتب ملاحظة داخلية…"
              className="min-h-20 w-full resize-y rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button className="mt-2" size="sm" disabled={!note.trim()}>
              إضافة ملاحظة
            </Button>
          </form>
        )}
        <div className="mt-4 space-y-1">
          {contact.notes.map((item) => (
            <article key={item.id} className="border-b py-3 last:border-b-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <strong>{item.authorName}</strong>
                <time className="text-muted-foreground">
                  {formatContactDate(item.createdAt, true)}
                </time>
              </div>
              <p className="mt-1.5 text-sm leading-6" dir="auto">
                {item.content}
              </p>
            </article>
          ))}
          {!contact.notes.length && (
            <p className="py-3 text-sm text-muted-foreground">
              لا توجد ملاحظات بعد.
            </p>
          )}
        </div>
      </section>

      {allowDelete && (
        <footer className="border-t px-5 py-4">
          {confirmingDelete ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium">حذف جهة الاتصال؟</p>
              <p className="mt-1 text-xs text-muted-foreground">
                سيُزال السجل من مساحة جهات الاتصال التجريبية.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  حذف
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 aria-hidden />
              حذف جهة الاتصال
            </Button>
          )}
        </footer>
      )}
    </aside>
  )
}
