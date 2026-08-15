import { Injectable } from '@nestjs/common';
import { ValidationException } from '../../../core/exceptions';
import {
  normalizeArabic,
  normalizeDigits,
} from '../../../shared/utils/arabic-normalize';
import type { ApplicantIdentityRules } from '../types/admissions-reference.port';

export interface ApplicantIdentityInput {
  fullName: string;
  primaryPhone: string;
  guardianPhone?: string;
  nationalId?: string;
  alternativeIdentityReason?: string;
  dateOfBirth: string;
  graduationYear: number;
}

export interface NormalizedApplicantIdentity {
  fullName: string;
  normalizedFullName: string;
  primaryPhone: string;
  normalizedPrimaryPhone: string;
  guardianPhone?: string;
  normalizedGuardianPhone?: string;
  nationalId?: string;
  normalizedNationalId?: string;
}

@Injectable()
export class ApplicantPolicy {
  normalize(input: ApplicantIdentityInput): NormalizedApplicantIdentity {
    const fullName = input.fullName.trim().replace(/\s+/g, ' ');
    const primaryPhone = input.primaryPhone.trim();
    const guardianPhone = input.guardianPhone?.trim();
    const nationalId = input.nationalId?.trim();
    return {
      fullName,
      normalizedFullName: normalizeArabic(fullName).toLowerCase(),
      primaryPhone,
      normalizedPrimaryPhone: this.normalizePhone(primaryPhone),
      ...(guardianPhone
        ? {
            guardianPhone,
            normalizedGuardianPhone: this.normalizePhone(guardianPhone),
          }
        : {}),
      ...(nationalId
        ? {
            nationalId,
            normalizedNationalId: this.normalizeNationalId(nationalId),
          }
        : {}),
    };
  }

  validate(
    input: ApplicantIdentityInput,
    rules: ApplicantIdentityRules,
    today = new Date(),
  ): NormalizedApplicantIdentity {
    const normalized = this.normalize(input);
    const details: Array<{ field: string; message: string }> = [];
    if (normalized.fullName.length < 3 || normalized.fullName.length > 120)
      details.push({
        field: 'fullName',
        message: 'الاسم يجب أن يكون بين 3 و120 حرفاً',
      });
    if (!this.matches(normalized.normalizedPrimaryPhone, rules.phonePattern))
      details.push({
        field: 'primaryPhone',
        message: 'صيغة رقم الهاتف غير صحيحة',
      });
    if (
      normalized.normalizedNationalId &&
      !this.matches(normalized.normalizedNationalId, rules.nationalIdPattern)
    )
      details.push({
        field: 'nationalId',
        message: 'صيغة الرقم القومي غير صحيحة',
      });
    if (
      !normalized.normalizedNationalId &&
      !input.alternativeIdentityReason?.trim()
    )
      details.push({
        field: 'alternativeIdentityReason',
        message: 'يجب إدخال الرقم القومي أو سبب مستند الهوية البديل',
      });

    const birthDate = this.dateOnly(input.dateOfBirth);
    if (!birthDate || birthDate > today)
      details.push({ field: 'dateOfBirth', message: 'تاريخ الميلاد غير صالح' });
    else {
      const age = this.ageOn(birthDate, today);
      if (age < rules.minorAge && !normalized.normalizedGuardianPhone)
        details.push({
          field: 'guardianPhone',
          message: 'رقم هاتف ولي الأمر مطلوب للطالب القاصر',
        });
      if (
        normalized.normalizedGuardianPhone &&
        !this.matches(normalized.normalizedGuardianPhone, rules.phonePattern)
      )
        details.push({
          field: 'guardianPhone',
          message: 'صيغة رقم هاتف ولي الأمر غير صحيحة',
        });
      const currentYear = today.getUTCFullYear();
      if (
        !Number.isInteger(input.graduationYear) ||
        input.graduationYear > currentYear ||
        input.graduationYear <
          birthDate.getUTCFullYear() + rules.minimumGraduationAge
      )
        details.push({
          field: 'graduationYear',
          message: 'سنة التخرج غير متوافقة مع تاريخ الميلاد أو تقع في المستقبل',
        });
    }
    if (details.length) throw new ValidationException(details);
    return normalized;
  }

  normalizePhone(value: string): string {
    return normalizeDigits(value)
      .replace(/[\s()-]/g, '')
      .replace(/^\+20(?=1)/, '0');
  }

  normalizeNationalId(value: string): string {
    return normalizeDigits(value).replace(/\D/g, '');
  }

  private matches(value: string, configured?: string): boolean {
    if (!configured) return value.length >= 10;
    try {
      return new RegExp(configured).test(value);
    } catch {
      return false;
    }
  }

  private dateOnly(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
      ? null
      : date;
  }

  private ageOn(birth: Date, at: Date): number {
    let age = at.getUTCFullYear() - birth.getUTCFullYear();
    if (
      at.getUTCMonth() < birth.getUTCMonth() ||
      (at.getUTCMonth() === birth.getUTCMonth() &&
        at.getUTCDate() < birth.getUTCDate())
    )
      age -= 1;
    return age;
  }
}
