import { z } from "zod"
import { applicantRuleErrors } from "../utils/applicant-rules"
import { academicSelectionSchema } from "./academic-selection-schema"
import { financialInputSchema } from "./admission-finance-schema"

export const applicantSchema = z
  .object({
    fullName: z.string().trim().min(3, "الاسم الكامل مطلوب"),
    primaryPhone: z.string().trim().min(10, "رقم الهاتف مطلوب"),
    guardianPhone: z.string().optional(),
    nationalId: z.string().optional(),
    alternativeIdentityReason: z.string().optional(),
    address: z.string().trim().min(5, "العنوان مطلوب"),
    dateOfBirth: z.string().min(1, "تاريخ الميلاد مطلوب"),
    qualificationId: z.string().min(1, "المؤهل مطلوب"),
    graduationYear: z.number().int(),
    notes: z.string(),
    profileImageUrl: z.string().optional(),
  })
  .superRefine((value, context) => {
    for (const [path, message] of Object.entries(applicantRuleErrors(value))) {
      context.addIssue({ code: "custom", path: [path], message })
    }
  })

export const assignmentSchema = z.object({
  registrationBranchId: z.string().min(1, "فرع التسجيل مطلوب"),
  studyBranchId: z.string().min(1, "فرع الدراسة مطلوب"),
  admissionsEmployeeId: z.string().min(1, "موظف القبول مطلوب"),
  customerServiceEmployeeId: z.string().min(1, "موظف خدمة العملاء مطلوب"),
  customerServiceManagerId: z.string().min(1, "مدير خدمة العملاء مطلوب"),
  departmentId: z.string().min(1, "القسم مطلوب"),
  leadSourceId: z.string().min(1, "مصدر العميل مطلوب"),
  academicGradeId: z.string().optional(),
})

export const draftAdmissionSchema = z.object({
  applicant: applicantSchema,
  assignment: assignmentSchema,
  selection: academicSelectionSchema.optional(),
  financial: financialInputSchema.optional(),
  notes: z.string(),
})

export type DraftAdmissionValues = z.infer<typeof draftAdmissionSchema>
