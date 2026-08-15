import { Injectable } from '@nestjs/common';
import { EntityStatus, type Prisma } from '../../../../prisma/generated/client';
import {
  DateOverlapException,
  EntityInUseException,
  OrganizationInvalidStateException,
  VersionConflictException,
} from '../../../core/exceptions';
import { parseDateOnly } from '../types/organization-normalization';
import { AcademicTermRepository } from './academic-term.repository';
import { AcademicYearRepository } from './academic-year.repository';

@Injectable()
export class AcademicCalendarPolicy {
  constructor(
    private readonly years: AcademicYearRepository,
    private readonly terms: AcademicTermRepository,
  ) {}

  dates(start: string, end: string): { startDate: Date; endDate: Date } {
    const startDate = parseDateOnly(start);
    const endDate = parseDateOnly(end);
    if (!startDate || !endDate || startDate > endDate) {
      throw new OrganizationInvalidStateException('نطاق التاريخ غير صالح');
    }
    return { startDate, endDate };
  }

  async assertTermRange(
    yearId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const year = await this.years.findById(yearId, tx);
    if (!year || year.status === EntityStatus.ARCHIVED) {
      throw new OrganizationInvalidStateException('العام الأكاديمي غير متاح');
    }
    if (startDate < year.startDate || endDate > year.endDate) {
      throw new OrganizationInvalidStateException(
        'يجب أن تقع تواريخ الفصل داخل العام الأكاديمي',
      );
    }
    if (
      await this.terms.findOverlap(yearId, startDate, endDate, excludeId, tx)
    ) {
      throw new DateOverlapException();
    }
  }

  assertInsertOrder(order: number, count: number): void {
    if (!Number.isInteger(order) || order < 1 || order > count + 1)
      throw new OrganizationInvalidStateException(
        'ترتيب الفصل يجب أن يكون ضمن التسلسل المتاح',
      );
  }

  assertYearVersion(actual: number, expected: number): void {
    if (actual !== expected) throw new VersionConflictException(actual);
  }

  async assertYearArchivable(id: string): Promise<void> {
    const year = await this.years.findById(id);
    if (year?.status === EntityStatus.ACTIVE) {
      throw new EntityInUseException('لا يمكن أرشفة العام الأكاديمي النشط');
    }
  }
}
