import type { ConversationDetail } from "../types/projections"
function Item({
  label,
  value,
  ltr,
}: {
  label: string
  value: string
  ltr?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  )
}
export function CustomerProfile({
  conversation,
}: {
  conversation: ConversationDetail
}) {
  return (
    <section aria-labelledby="customer-profile-title" className="space-y-4">
      <h3 id="customer-profile-title" className="font-medium">
        بيانات العميل
      </h3>
      <dl className="space-y-4">
        <Item label="الاسم" value={conversation.customer.name} />
        <Item label="الهاتف" value={conversation.customer.phone} ltr />
        <Item
          label="الموظف المسؤول"
          value={conversation.employee?.label ?? "غير مسند"}
        />
        <Item label="الفريق" value={conversation.team?.label ?? "غير مسند"} />
        <Item
          label="أول تواصل"
          value={new Intl.DateTimeFormat("ar-EG", {
            dateStyle: "medium",
          }).format(new Date(conversation.customer.firstContactAt))}
        />
      </dl>
    </section>
  )
}
