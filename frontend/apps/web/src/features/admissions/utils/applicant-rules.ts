import type { Applicant } from "../types/domain"
import type { ApplicantInput } from "../types/commands"

export const normalizeArabicText = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ar")

export const normalizePhone = (value: string) => value.replace(/\D/g, "")
export const normalizeNationalId = (value: string) => value.replace(/\D/g, "")

export function ageOn(dateOfBirth: string, on = new Date()) {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`)
  let age = on.getUTCFullYear() - birth.getUTCFullYear()
  if (
    on.getUTCMonth() < birth.getUTCMonth() ||
    (on.getUTCMonth() === birth.getUTCMonth() &&
      on.getUTCDate() < birth.getUTCDate())
  )
    age -= 1
  return age
}

export function applicantRuleErrors(input: ApplicantInput, today = new Date()) {
  const errors: Record<string, string> = {}
  const phone = normalizePhone(input.primaryPhone)
  if (phone.length < 10 || phone.length > 15)
    errors.primaryPhone = "رقم الهاتف غير صالح"
  if (input.nationalId && normalizeNationalId(input.nationalId).length !== 14)
    errors.nationalId = "الرقم القومي يجب أن يتكون من 14 رقمًا"
  if (!input.nationalId && !input.alternativeIdentityReason?.trim())
    errors.alternativeIdentityReason = "اذكر سبب عدم توفر الرقم القومي"
  const age = ageOn(input.dateOfBirth, today)
  if (!Number.isFinite(age) || age < 10 || age > 100)
    errors.dateOfBirth = "تاريخ الميلاد غير منطقي"
  if (age < 18 && normalizePhone(input.guardianPhone ?? "").length < 10)
    errors.guardianPhone = "رقم ولي الأمر مطلوب لمن هم دون 18 عامًا"
  const year = today.getUTCFullYear()
  if (input.graduationYear > year || input.graduationYear < year - 80)
    errors.graduationYear = "سنة التخرج غير صالحة"
  return errors
}

export function duplicateApplicants(
  input: ApplicantInput,
  applicants: Applicant[]
) {
  const nationalId = normalizeNationalId(input.nationalId ?? "")
  const phone = normalizePhone(input.primaryPhone)
  const name = normalizeArabicText(input.fullName)
  return applicants.flatMap((applicant) => {
    const reasons: string[] = []
    if (
      nationalId &&
      normalizeNationalId(applicant.nationalId ?? "") === nationalId
    )
      reasons.push("national-id")
    if (normalizePhone(applicant.primaryPhone) === phone) reasons.push("phone")
    if (
      normalizeArabicText(applicant.fullName) === name &&
      applicant.dateOfBirth === input.dateOfBirth
    )
      reasons.push("name-and-birth-date")
    return reasons.length ? [{ applicant, reasons }] : []
  })
}
