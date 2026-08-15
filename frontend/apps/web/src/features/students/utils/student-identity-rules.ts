import type { StudentIdentityRules } from "../types/domain"

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g

/** Folds Arabic-Indic digits to ASCII so identifiers and phones compare reliably. */
export function normalizeDigits(value: string): string {
  return value.replace(ARABIC_INDIC_DIGITS, (digit) => {
    const code = digit.charCodeAt(0)
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660
    return String(code - base)
  })
}

/** Folds Arabic letter variants so "أحمد", "احمد", and "إحمد" all match. */
export function normalizeArabic(value: string): string {
  return normalizeDigits(value)
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ً-ْـ]/g, "")
}

export function normalizeSearchTerm(value: string): string {
  return normalizeArabic(value).trim().replace(/\s+/g, " ").toLowerCase()
}

export function normalizePhone(value: string): string {
  return normalizeDigits(value).replace(/[\s\-()]/g, "")
}

export function normalizeNationalId(value: string): string {
  return normalizeDigits(value).replace(/\s/g, "")
}

export function matchesPattern(value: string, pattern: string): boolean {
  return new RegExp(pattern).test(value)
}

export function isValidPhone(
  value: string,
  rules: StudentIdentityRules
): boolean {
  return matchesPattern(normalizePhone(value), rules.phonePattern)
}

export function isValidNationalId(
  value: string,
  rules: StudentIdentityRules
): boolean {
  return matchesPattern(normalizeNationalId(value), rules.nationalIdPattern)
}

/** Whole years between a birth date and a reference date. */
export function ageInYears(dateOfBirth: string, on: string): number {
  const birth = new Date(dateOfBirth)
  const reference = new Date(on)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime()))
    return Number.NaN
  let age = reference.getUTCFullYear() - birth.getUTCFullYear()
  const monthDelta = reference.getUTCMonth() - birth.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && reference.getUTCDate() < birth.getUTCDate()))
    age -= 1
  return age
}

export function isMinor(
  dateOfBirth: string,
  rules: StudentIdentityRules,
  on: string
): boolean {
  const age = ageInYears(dateOfBirth, on)
  return Number.isNaN(age) ? false : age < rules.minorAgeThreshold
}

/** A minor must carry a guardian phone (spec FR-009). */
export function guardianPhoneRequired(
  dateOfBirth: string,
  rules: StudentIdentityRules,
  on: string
): boolean {
  return isMinor(dateOfBirth, rules, on)
}

export function isPlausibleDateOfBirth(value: string, on: string): boolean {
  const birth = new Date(value)
  if (Number.isNaN(birth.getTime())) return false
  if (birth.getTime() > new Date(on).getTime()) return false
  const age = ageInYears(value, on)
  return age >= 0 && age <= 120
}

export function isPlausibleGraduationYear(
  graduationYear: number,
  dateOfBirth: string,
  rules: StudentIdentityRules,
  on: string
): boolean {
  if (!Number.isInteger(graduationYear)) return false
  const currentYear = new Date(on).getUTCFullYear()
  if (graduationYear > currentYear) return false
  const birthYear = new Date(dateOfBirth).getUTCFullYear()
  if (Number.isNaN(birthYear)) return false
  return graduationYear >= birthYear + rules.minimumGraduationAge
}

/** Without a national identifier, a documented alternative reason is required. */
export function identityEvidenceSatisfied(input: {
  nationalId?: string
  alternativeIdentityReason?: string
}): boolean {
  if (input.nationalId?.trim()) return true
  return Boolean(input.alternativeIdentityReason?.trim())
}

/** Masks all but the last four digits for scoped list projections. */
export function redactPhone(value: string): string {
  const normalized = normalizePhone(value)
  if (normalized.length <= 4) return normalized
  return normalized.replace(/.(?=.{4})/g, "•")
}
