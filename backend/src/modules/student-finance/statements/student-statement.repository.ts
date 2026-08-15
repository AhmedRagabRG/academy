import { Injectable } from '@nestjs/common';
import type { Invoice } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * The statement's only database reach. Keeping it here rather than in the
 * service is what the layering rule protects: a service that queries Prisma
 * directly cannot be reused or tested without a database
 * (constitution Principle V).
 */
@Injectable()
export class StudentStatementRepository {
  constructor(private readonly prisma: PrismaService) {}

  findInvoicesForStudent(studentId: string): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
