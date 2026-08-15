import { makeMoney } from "@/shared/utils/money"
import type {
  ActorRef,
  ExpenseCategoryId,
  ExpenseRequestId,
  ExpenseStatus,
  ExpenseSubCategoryId,
  HistoryAction,
  HistoryEntryId,
  AttachmentId,
  CommentId,
} from "../types/common"
import type {
  ExpenseAttachment,
  ExpenseCategory,
  ExpenseComment,
  ExpenseRequest,
  ExpenseSubCategory,
  HistoryEntry,
} from "../types/domain"
import { CURRENCY, ORGANIZATION_ID, PRECISION, numberingPolicy } from "./accounting-lookups"
import { formatRequestNumber } from "../utils/accounting-numbering"

export interface AccountingStore {
  categories: ExpenseCategory[]
  subCategories: ExpenseSubCategory[]
  requests: ExpenseRequest[]
  attachments: ExpenseAttachment[]
  history: HistoryEntry[]
  comments: ExpenseComment[]
  requestSequence: number
}

const money = (amount: string) => makeMoney(amount, CURRENCY, PRECISION)

const finance: ActorRef = { id: "user-finance", name: "مدير مالي", active: true }
const branchManager: ActorRef = {
  id: "user-branch",
  name: "مدير فرع",
  active: true,
}
const admin: ActorRef = { id: "user-admin", name: "مدير النظام", active: true }

const audit = (at: string, by: ActorRef, version = 1) => ({
  createdAt: at,
  createdBy: by,
  updatedAt: at,
  updatedBy: by,
  version,
})

/** Seeded examples. Data, not application rules — every one is administrable. */
const categorySeeds: { id: string; name: string; description: string; archived?: true }[] = [
  { id: "marketing", name: "التسويق", description: "الحملات والإعلانات والمطبوعات" },
  { id: "office", name: "المكتب", description: "المستلزمات والأثاث المكتبي" },
  { id: "utilities", name: "المرافق", description: "الكهرباء والمياه والاتصالات" },
  { id: "maintenance", name: "الصيانة", description: "صيانة المباني والتجهيزات" },
  { id: "transportation", name: "المواصلات", description: "الانتقالات والشحن" },
  { id: "equipment", name: "المعدات", description: "الأجهزة والمعدات التقنية" },
  {
    id: "legacy",
    name: "بند قديم",
    description: "تصنيف لم يعد مستخدمًا",
    archived: true,
  },
]

const subCategorySeeds: {
  id: string
  categoryId: string
  name: string
  description: string
}[] = [
  { id: "facebook-ads", categoryId: "marketing", name: "إعلانات فيسبوك", description: "حملات مدفوعة على فيسبوك" },
  { id: "google-ads", categoryId: "marketing", name: "إعلانات جوجل", description: "حملات مدفوعة على جوجل" },
  { id: "printing", categoryId: "marketing", name: "المطبوعات", description: "بروشورات ولافتات" },
  { id: "design", categoryId: "marketing", name: "التصميم", description: "أعمال التصميم الخارجية" },
  { id: "stationery", categoryId: "office", name: "قرطاسية", description: "أدوات مكتبية" },
  { id: "furniture", categoryId: "office", name: "أثاث", description: "مكاتب وكراسي" },
  { id: "electricity", categoryId: "utilities", name: "كهرباء", description: "فواتير الكهرباء" },
  { id: "internet", categoryId: "utilities", name: "إنترنت", description: "اشتراكات الإنترنت" },
  { id: "hvac", categoryId: "maintenance", name: "تكييف", description: "صيانة أجهزة التكييف" },
  { id: "fuel", categoryId: "transportation", name: "وقود", description: "وقود سيارات الفرع" },
  { id: "laptops", categoryId: "equipment", name: "حواسيب محمولة", description: "أجهزة الموظفين" },
]

interface RequestSeed {
  branchId: string
  requester: ActorRef
  categoryId: string
  subCategoryId?: string
  description: string
  amount: string
  requestDate: string
  status: ExpenseStatus
  note?: string
}

/** Requests in every one of the eight statuses, so no state is untested. */
const requestSeeds: RequestSeed[] = [
  {
    branchId: "branch-cairo",
    requester: branchManager,
    categoryId: "marketing",
    subCategoryId: "facebook-ads",
    description: "حملة إعلانية لدورة اللغة الإنجليزية",
    amount: "4500.00",
    requestDate: "2026-07-20T09:00:00.000Z",
    status: "draft",
  },
  {
    branchId: "branch-cairo",
    requester: branchManager,
    categoryId: "office",
    subCategoryId: "stationery",
    description: "قرطاسية الربع الثالث",
    amount: "1250.50",
    requestDate: "2026-07-22T09:00:00.000Z",
    status: "submitted",
  },
  {
    branchId: "branch-giza",
    requester: branchManager,
    categoryId: "utilities",
    subCategoryId: "electricity",
    description: "فاتورة الكهرباء لشهر يوليو",
    amount: "8300.00",
    requestDate: "2026-07-25T09:00:00.000Z",
    status: "under-review",
  },
  {
    branchId: "branch-giza",
    requester: branchManager,
    categoryId: "maintenance",
    subCategoryId: "hvac",
    description: "صيانة أجهزة التكييف بالطابق الثاني",
    amount: "6200.00",
    requestDate: "2026-07-10T09:00:00.000Z",
    status: "returned-for-revision",
    note: "المبلغ يحتاج عرض سعر إضافي",
  },
  {
    branchId: "branch-cairo",
    requester: branchManager,
    categoryId: "equipment",
    subCategoryId: "laptops",
    description: "ثلاثة حواسيب محمولة لقسم القبول",
    amount: "45000.00",
    requestDate: "2026-07-05T09:00:00.000Z",
    status: "approved",
  },
  {
    branchId: "branch-alex",
    requester: branchManager,
    categoryId: "transportation",
    subCategoryId: "fuel",
    description: "وقود سيارة الفرع",
    amount: "2100.00",
    requestDate: "2026-06-28T09:00:00.000Z",
    status: "rejected",
    note: "خارج ميزانية الفرع لهذا الشهر",
  },
  {
    branchId: "branch-cairo",
    requester: branchManager,
    categoryId: "marketing",
    subCategoryId: "printing",
    description: "طباعة بروشورات المعرض",
    amount: "3400.00",
    requestDate: "2026-06-15T09:00:00.000Z",
    status: "paid",
  },
  {
    branchId: "branch-giza",
    requester: branchManager,
    categoryId: "office",
    description: "طلب أُلغي قبل الاعتماد",
    amount: "900.00",
    requestDate: "2026-06-10T09:00:00.000Z",
    status: "cancelled",
    note: "لم تعد هناك حاجة للطلب",
  },
]

/**
 * The history a seeded request would have accumulated on its way to its status.
 * Seeding the destination without the journey would make the history a lie.
 */
const historyPath: Record<ExpenseStatus, ExpenseStatus[]> = {
  draft: [],
  submitted: ["submitted"],
  "under-review": ["submitted", "under-review"],
  "returned-for-revision": ["submitted", "under-review", "returned-for-revision"],
  approved: ["submitted", "under-review", "approved"],
  rejected: ["submitted", "under-review", "rejected"],
  paid: ["submitted", "under-review", "approved", "paid"],
  cancelled: ["submitted", "cancelled"],
}

const actionFor = (to: ExpenseStatus): HistoryAction =>
  to === "under-review"
    ? "review-started"
    : to === "returned-for-revision"
      ? "returned"
      : (to as HistoryAction)

const actorFor = (to: ExpenseStatus): ActorRef =>
  to === "submitted" || to === "cancelled" ? branchManager : finance

let counter = 0
const nextId = (prefix: string) => `${prefix}-${(counter += 1)}`

/** Rebuilt on demand so tests never share mutations. */
export function createAccountingStore(): AccountingStore {
  counter = 0

  const categories: ExpenseCategory[] = categorySeeds.map((seed) => ({
    ...audit("2026-01-05T09:00:00.000Z", admin),
    id: `category-${seed.id}` as ExpenseCategoryId,
    organizationId: ORGANIZATION_ID,
    name: seed.name,
    description: seed.description,
    status: seed.archived ? "archived" : "active",
  }))

  const subCategories: ExpenseSubCategory[] = subCategorySeeds.map((seed) => ({
    ...audit("2026-01-05T09:00:00.000Z", admin),
    id: `sub-category-${seed.id}` as ExpenseSubCategoryId,
    organizationId: ORGANIZATION_ID,
    categoryId: `category-${seed.categoryId}` as ExpenseCategoryId,
    name: seed.name,
    description: seed.description,
    status: "active",
  }))

  const requests: ExpenseRequest[] = []
  const history: HistoryEntry[] = []
  const attachments: ExpenseAttachment[] = []
  const comments: ExpenseComment[] = []

  requestSeeds.forEach((seed, index) => {
    const id = `request-${index + 1}` as ExpenseRequestId
    const path = historyPath[seed.status]
    const decidedStatus = path.at(-1)

    requests.push({
      ...audit(seed.requestDate, seed.requester, path.length + 1),
      id,
      organizationId: ORGANIZATION_ID,
      requestNumber: formatRequestNumber(numberingPolicy, index + 1),
      requestDate: seed.requestDate,
      branchId: seed.branchId,
      requestedBy: seed.requester,
      categoryId: `category-${seed.categoryId}` as ExpenseCategoryId,
      subCategoryId: seed.subCategoryId
        ? (`sub-category-${seed.subCategoryId}` as ExpenseSubCategoryId)
        : undefined,
      description: seed.description,
      amount: money(seed.amount),
      status: seed.status,
      reviewer: path.includes("under-review") ? finance : undefined,
      decision:
        decidedStatus === "approved" ||
        decidedStatus === "rejected" ||
        decidedStatus === "returned-for-revision"
          ? {
              decision:
                decidedStatus === "returned-for-revision"
                  ? "returned"
                  : decidedStatus,
              note: seed.note,
              decidedAt: seed.requestDate,
              decidedBy: finance,
            }
          : seed.status === "paid"
            ? {
                decision: "approved",
                decidedAt: seed.requestDate,
                decidedBy: finance,
              }
            : undefined,
      cancelReason: seed.status === "cancelled" ? seed.note : undefined,
      paidAt: seed.status === "paid" ? seed.requestDate : undefined,
    })

    // Creation, then one entry per hop along the path to the seeded status.
    history.push({
      id: nextId("history") as HistoryEntryId,
      requestId: id,
      action: "created",
      fromStatus: null,
      toStatus: "draft",
      performedBy: seed.requester,
      occurredAt: seed.requestDate,
      sequence: 1,
    })

    let previous: ExpenseStatus = "draft"
    path.forEach((to, step) => {
      history.push({
        id: nextId("history") as HistoryEntryId,
        requestId: id,
        action: actionFor(to),
        fromStatus: previous,
        toStatus: to,
        performedBy: actorFor(to),
        occurredAt: seed.requestDate,
        sequence: step + 2,
        note:
          to === "rejected" || to === "returned-for-revision" || to === "cancelled"
            ? seed.note
            : undefined,
      })
      previous = to
    })

    if (index % 3 === 0)
      attachments.push({
        id: nextId("attachment") as AttachmentId,
        requestId: id,
        kind: "invoice",
        fileName: `invoice-${index + 1}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 240_000,
        uploadAttempt: `seed-${index + 1}`,
        uploadedBy: seed.requester,
        uploadedAt: seed.requestDate,
      })

    if (seed.status === "returned-for-revision")
      comments.push({
        id: nextId("comment") as CommentId,
        requestId: id,
        body: "أرفقت عرض السعر الثاني، برجاء المراجعة.",
        author: seed.requester,
        createdAt: seed.requestDate,
      })
  })

  return {
    categories,
    subCategories,
    requests,
    attachments,
    history,
    comments,
    requestSequence: requestSeeds.length,
  }
}
