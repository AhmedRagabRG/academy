import { Injectable } from '@nestjs/common';
import type { ErrorDetail } from '../../../core/exceptions/domain.exception';
import { StudentValidationFailedException } from '../../../core/exceptions/students.exceptions';
import {
  normalizeArabic,
  normalizeDigits,
} from '../../../shared/utils/arabic-normalize';
import type { StudentIdentityRules } from '../types/students.types';

export interface StudentIdentityInput {
  fullName: string;
  primaryPhone: string;
  guardianName?: string;
  guardianPhone?: string;
  nationalId?: string;
  alternativeIdentityReason?: string;
  address: string;
  dateOfBirth: string;
  graduationYear: number;
}

export interface NormalizedStudentIdentity {
  searchName: string;
  primaryPhone: string;
  guardianPhone?: string;
  nationalId?: string;
  normalizedNationalId?: string;
}

/**
 * Enforces exactly the rules the system publishes through /students/lookups.
 * The values are configurable and arrive from Organization settings — never
 * hardcoded here (FR-012).
 */
@Injectable()
export class StudentIdentityPolicy {
  validate(
    input: StudentIdentityInput,
    rules: StudentIdentityRules,
    now: Date = new Date(),
  ): NormalizedStudentIdentity {
    const findings: ErrorDetail[] = [];

    const fullName = input.fullName?.trim() ?? '';
    if (fullName.length < 3 || fullName.length > 120)
      findings.push({
        field: 'identity.fullName',
        message: 'الاسم الكامل مطلوب ولا يقل عن ٣ أحرف',
      });

    const phonePattern = new RegExp(rules.phonePattern);
    const primaryPhone = normalizeDigits(input.primaryPhone?.trim() ?? '');
    if (!phonePattern.test(primaryPhone))
      findings.push({
        field: 'identity.primaryPhone',
        message: 'صيغة رقم الهاتف غير صحيحة',
      });

    const guardianName = input.guardianName?.trim();
    if (guardianName && (guardianName.length < 3 || guardianName.length > 120))
      findings.push({
        field: 'identity.guardianName',
        message: 'اسم ولي الأمر لا يقل عن ٣ أحرف',
      });

    const guardianPhone = input.guardianPhone
      ? normalizeDigits(input.guardianPhone.trim())
      : undefined;
    if (guardianPhone && !phonePattern.test(guardianPhone))
      findings.push({
        field: 'identity.guardianPhone',
        message: 'صيغة رقم هاتف ولي الأمر غير صحيحة',
      });

    const address = input.address?.trim() ?? '';
    if (address.length < 3 || address.length > 250)
      findings.push({ field: 'identity.address', message: 'العنوان مطلوب' });

    const birthDate = this.parseDate(input.dateOfBirth);
    let age: number | null = null;
    if (!birthDate || birthDate.getTime() > now.getTime()) {
      findings.push({
        field: 'identity.dateOfBirth',
        message: 'تاريخ الميلاد غير منطقي',
      });
    } else {
      age = this.ageOn(birthDate, now);
      if (age < 0 || age > 120)
        findings.push({
          field: 'identity.dateOfBirth',
          message: 'تاريخ الميلاد غير منطقي',
        });
    }

    // A minor must have a reachable guardian.
    if (age !== null && age < rules.minorAgeThreshold && !guardianPhone)
      findings.push({
        field: 'identity.guardianPhone',
        message: 'رقم هاتف ولي الأمر مطلوب للطالب القاصر',
      });

    const nationalIdRaw = input.nationalId?.trim();
    const nationalId = nationalIdRaw
      ? normalizeDigits(nationalIdRaw)
      : undefined;
    const reason = input.alternativeIdentityReason?.trim();
    if (nationalId) {
      if (!new RegExp(rules.nationalIdPattern).test(nationalId))
        findings.push({
          field: 'identity.nationalId',
          message: 'صيغة الرقم القومي غير صحيحة',
        });
    } else if (!reason) {
      findings.push({
        field: 'identity.alternativeIdentityReason',
        message:
          'يجب إدخال الرقم القومي أو تحديد سبب الاعتماد على مستند هوية بديل',
      });
    }
    if (reason && reason.length > 250)
      findings.push({
        field: 'identity.alternativeIdentityReason',
        message: 'السبب يتجاوز الحد المسموح',
      });

    if (!Number.isInteger(input.graduationYear)) {
      findings.push({
        field: 'identity.graduationYear',
        message: 'سنة التخرج غير صالحة',
      });
    } else if (birthDate) {
      const currentYear = now.getUTCFullYear();
      const minimumYear =
        birthDate.getUTCFullYear() + rules.minimumGraduationAge;
      if (
        input.graduationYear > currentYear ||
        input.graduationYear < minimumYear
      )
        findings.push({
          field: 'identity.graduationYear',
          message: 'سنة التخرج غير متوافقة مع تاريخ الميلاد أو تقع في المستقبل',
        });
    }

    if (findings.length) throw new StudentValidationFailedException(findings);

    return {
      searchName: normalizeArabic(fullName).toLowerCase(),
      primaryPhone,
      ...(guardianPhone ? { guardianPhone } : {}),
      ...(nationalId ? { nationalId, normalizedNationalId: nationalId } : {}),
    };
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;
    const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /** Whole years elapsed, evaluated in UTC to match the stored date-only value. */
  private ageOn(birthDate: Date, now: Date): number {
    let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDelta = now.getUTCMonth() - birthDate.getUTCMonth();
    if (
      monthDelta < 0 ||
      (monthDelta === 0 && now.getUTCDate() < birthDate.getUTCDate())
    )
      age -= 1;
    return age;
  }
}
