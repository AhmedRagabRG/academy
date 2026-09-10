import type { Conversation, Customer } from "../types/domain"
import type {
  ConversationId,
  CustomerId,
  EmployeeId,
  MessageId,
  NoteId,
  PlatformId,
  TagId,
  TeamId,
} from "../types/common"

const now = Date.now()
const customerNames = [
  "مريم خالد",
  "يوسف أحمد",
  "نور محمود",
  "ليان سمير",
  "عمر عبد الرحمن",
  "جنى طارق",
  "آدم محمد",
  "سلمى حسين",
  "ملك إبراهيم",
  "زياد علي",
  "هنا عادل",
  "سيف مصطفى",
]
export const customers: Customer[] = customerNames.map((name, index) => ({
  id: `customer-${index + 1}` as CustomerId,
  name,
  phone: `+20 10 5555 ${String(1100 + index)}`,
  firstContactAt: new Date(now - (index + 20) * 86400000).toISOString(),
  lastActivityAt: new Date(now - index * 3600000).toISOString(),
}))

export const conversations: Conversation[] = customers.map(
  (customer, index) => {
    const id = `conversation-${index + 1}` as ConversationId
    const employee =
      index % 4 === 3
        ? null
        : ((index % 3 === 0
            ? "employee-demo"
            : index % 3 === 1
              ? "employee-sara"
              : "employee-omar") as EmployeeId)
    const team =
      index % 4 === 3
        ? null
        : ((index % 3 === 2 ? "team-support" : "team-admissions") as TeamId)
    const sentAt = new Date(now - index * 3600000).toISOString()
    const status =
      (["open", "pending", "snoozed", "closed", "archived"] as const)[
        index % 5
      ] ?? "open"
    return {
      id,
      customerId: customer.id,
      platformId: (
        ["platform-web", "platform-email", "platform-phone"] as const
      )[index % 3] as PlatformId,
      status,
      assignedEmployeeId: employee,
      assignedTeamId: team,
      tagIds: [
        (
          [
            "tag-lead",
            "tag-vip",
            "tag-follow",
            "tag-payment",
            "tag-registered",
          ] as const
        )[index % 5] as TagId,
      ],
      unreadCount: index % 4,
      lastMessage:
        index % 2
          ? "أحتاج معرفة مواعيد الدراسة والرسوم"
          : "شكرًا، سأراجع المستندات وأعود إليكم",
      lastActivityAt: sentAt,
      version: 1,
      ai: {
        mode: "auto",
        pausedReason: null,
        pausedAt: null,
        resumeAt: null,
        agentEnabled: true,
        version: 1,
      },
      messages: [
        {
          id: `message-${index}-1` as MessageId,
          conversationId: id,
          direction: "incoming",
          authorType: "customer",
          senderName: customer.name,
          body: "مرحبًا، أريد الاستفسار عن البرنامج المناسب.",
          sentAt: new Date(Date.parse(sentAt) - 3600000).toISOString(),
          delivery: "received",
          attachments: [],
        },
        {
          id: `message-${index}-2` as MessageId,
          conversationId: id,
          direction: "outgoing",
          authorType: "human-agent",
          senderName: "أحمد محمد",
          body: "أهلًا بك، يسعدني مساعدتك. ما المرحلة الدراسية؟",
          sentAt,
          delivery: "read",
          attachments:
            index === 0
              ? [
                  {
                    id: "attachment-1",
                    kind: "pdf",
                    fileName: "دليل-البرامج.pdf",
                    sizeBytes: 245000,
                  },
                ]
              : [],
        },
      ],
      notes:
        index === 0
          ? [
              {
                id: "note-1" as NoteId,
                conversationId: id,
                authorEmployeeId: "employee-demo" as EmployeeId,
                authorName: "أحمد محمد",
                content: "العميلة مهتمة بالتسجيل المبكر.",
                createdAt: sentAt,
              },
            ]
          : [],
      assignmentHistory: [],
      systemEvents: [],
    }
  }
)
