import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';

const SEQUENCE_WIDTH = 5;

/**
 * Allocates `{academicYear}-{branchCode}-{sequence}`, e.g. `2027-CAI-00001`.
 *
 * The counter row is incremented inside the caller's intake transaction, so two
 * concurrent intakes serialize on the row rather than racing for the same
 * sequence (research.md R-002). The `@@unique([organizationId, studentCode])`
 * constraint is the backstop if a code is ever produced another way.
 */
@Injectable()
export class StudentCodeService {
  async allocate(
    input: {
      organizationId: string;
      academicYear: number;
      branchId: string;
      branchCode: string;
    },
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const counter = await tx.studentCodeCounter.upsert({
      where: {
        organizationId_academicYear_branchId: {
          organizationId: input.organizationId,
          academicYear: input.academicYear,
          branchId: input.branchId,
        },
      },
      create: {
        organizationId: input.organizationId,
        academicYear: input.academicYear,
        branchId: input.branchId,
        nextValue: 2,
      },
      update: { nextValue: { increment: 1 } },
      select: { nextValue: true },
    });

    // `upsert` returns the post-increment value on update and the seeded value
    // on create, so the allocated number is always one below what is stored.
    const allocated = counter.nextValue - 1;
    const sequence = String(allocated).padStart(SEQUENCE_WIDTH, '0');
    return `${input.academicYear}-${this.normalizeBranchCode(input.branchCode)}-${sequence}`;
  }

  /** Branch codes appear inside the student code, so keep them stable and safe. */
  private normalizeBranchCode(code: string): string {
    const cleaned = (code ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    return cleaned || 'GEN';
  }
}
