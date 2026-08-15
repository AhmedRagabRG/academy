import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../prisma/generated/client';
import { PrismaService } from './prisma.service';
@Injectable()
export class TransactionManager {
  constructor(private readonly prisma: PrismaService) {}
  run<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  async runSerializable<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    maxAttempts = 3,
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: 'Serializable',
        });
      } catch (error: unknown) {
        const retryable =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2034';
        if (!retryable || attempt >= maxAttempts) throw error;
      }
    }
    throw new Error('Unreachable serializable transaction state');
  }
}
