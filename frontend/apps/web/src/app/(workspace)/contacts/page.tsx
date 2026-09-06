import type { Metadata } from "next"
import { ContactsScreen } from "@/features/contacts"

export const metadata: Metadata = {
  title: "جهات الاتصال",
  description: "إدارة جهات الاتصال القادمة من القنوات المتصلة والمصادر اليدوية",
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string; edit?: string }>
}) {
  const params = await searchParams
  return (
    <ContactsScreen
      initialContactId={params.contact}
      initialEditing={params.edit === "1"}
    />
  )
}
