"use client"

import { Building2, Mail, Phone } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import type { Contact } from "../types/domain"
import { ContactAvatar, formatContactDate, SourceBadge } from "./contact-ui"

interface ContactListProps {
  contacts: Contact[]
  selectedId?: string
  selectedIds: string[]
  view: "list" | "table"
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}

function SelectionBox({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={onChange}
      className="size-4 shrink-0 accent-brand-blue"
    />
  )
}

export function ContactList({
  contacts,
  selectedId,
  selectedIds,
  view,
  onSelect,
  onToggle,
}: ContactListProps) {
  if (!contacts.length)
    return (
      <div className="grid min-h-72 place-items-center px-6 text-center">
        <div>
          <p className="font-medium text-brand-navy dark:text-foreground">
            لا توجد جهات اتصال مطابقة
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            غيّر البحث أو المصدر، أو أضف جهة اتصال جديدة.
          </p>
        </div>
      </div>
    )

  if (view === "table")
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/45 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3" aria-label="التحديد" />
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">
                بيانات التواصل
              </th>
              <th className="px-4 py-3 text-start font-medium">الشركة</th>
              <th className="px-4 py-3 text-start font-medium">المصدر</th>
              <th className="px-4 py-3 text-start font-medium">آخر نشاط</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className={cn(
                  "border-b transition-colors last:border-b-0 hover:bg-brand-blue/[0.035]",
                  selectedId === contact.id && "bg-brand-blue/[0.065]"
                )}
              >
                <td className="px-4 py-3">
                  <SelectionBox
                    checked={selectedIds.includes(contact.id)}
                    label={`تحديد ${contact.name}`}
                    onChange={() => onToggle(contact.id)}
                  />
                </td>
                <td className="p-0">
                  <button
                    type="button"
                    onClick={() => onSelect(contact.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <ContactAvatar contact={contact} size="sm" />
                    <span className="font-medium">{contact.name}</span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div dir="ltr" className="text-end">
                    <p>{contact.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.email ?? "—"}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">{contact.company ?? "—"}</td>
                <td className="px-4 py-3">
                  <SourceBadge source={contact.source} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatContactDate(contact.lastActivityAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

  return (
    <div className="divide-y">
      {contacts.map((contact) => (
        <article
          key={contact.id}
          className={cn(
            "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-blue/[0.035]",
            selectedId === contact.id && "bg-brand-blue/[0.065]"
          )}
        >
          <SelectionBox
            checked={selectedIds.includes(contact.id)}
            label={`تحديد ${contact.name}`}
            onChange={() => onToggle(contact.id)}
          />
          <button
            type="button"
            onClick={() => onSelect(contact.id)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-start focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ContactAvatar contact={contact} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <strong className="truncate text-sm">{contact.name}</strong>
                <SourceBadge source={contact.source} />
              </span>
              <span className="mt-1.5 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1" dir="ltr">
                  <Phone className="size-3.5" aria-hidden />
                  {contact.phone}
                </span>
                {contact.email && (
                  <span
                    className="inline-flex min-w-0 items-center gap-1"
                    dir="ltr"
                  >
                    <Mail className="size-3.5" aria-hidden />
                    <span className="truncate">{contact.email}</span>
                  </span>
                )}
                {contact.company && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-3.5" aria-hidden />
                    {contact.company}
                  </span>
                )}
              </span>
            </span>
            <time className="hidden shrink-0 text-xs text-muted-foreground sm:block">
              {formatContactDate(contact.lastActivityAt)}
            </time>
          </button>
        </article>
      ))}
    </div>
  )
}
