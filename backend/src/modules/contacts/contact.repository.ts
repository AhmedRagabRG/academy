import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '../../../prisma/generated/client';
import { DomainException } from '../../core/exceptions';
import { PrismaService } from '../../database/prisma.service';
import {
  normalizeArabic,
  normalizeDigits,
} from '../../shared/utils/arabic-normalize';
import type { ContactListDto } from './dto/contact.dto';

export interface ContactCursor {
  v: 1;
  fingerprint: string;
  id: string;
  snapshotAt: string;
  lastActivityAt: string;
  normalizedName: string;
  createdAt: string;
}

export const normalizePhone = (value: string): string =>
  normalizeDigits(value).replace(/\D/g, '');
export const normalizeName = (value: string): string =>
  normalizeArabic(value).trim().toLocaleLowerCase();
export const normalizeEmail = (value: string): string =>
  value.trim().toLocaleLowerCase();

@Injectable()
export class ContactRepository {
  constructor(readonly db: PrismaService) {}

  async organizationId(): Promise<string> {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  fingerprint(q: ContactListDto): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          search: q.search.trim().toLocaleLowerCase(),
          source: q.source ?? '',
          groupIds: [...q.groupIds].sort(),
          ownerId: q.ownerId ?? '',
          withoutOwner: q.withoutOwner,
          sort: q.sort,
          limit: q.limit,
        }),
      )
      .digest('base64url')
      .slice(0, 20);
  }

  encode(value: ContactCursor): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  decode(
    value: string | undefined,
    fingerprint: string,
  ): ContactCursor | undefined {
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as ContactCursor;
      if (
        parsed.v !== 1 ||
        !parsed.id ||
        Number.isNaN(Date.parse(parsed.snapshotAt)) ||
        Number.isNaN(Date.parse(parsed.lastActivityAt)) ||
        Number.isNaN(Date.parse(parsed.createdAt))
      )
        throw new Error('invalid');
      if (parsed.fingerprint !== fingerprint)
        throw new DomainException(
          'cursor-query-mismatch',
          'مؤشر الصفحة لا يخص هذا الاستعلام',
          409,
        );
      return parsed;
    } catch (error) {
      if (error instanceof DomainException) throw error;
      throw new DomainException('cursor-invalid', 'مؤشر الصفحة غير صالح', 400);
    }
  }

  orderBy(sort: string): Prisma.ContactOrderByWithRelationInput[] {
    if (sort === 'name') return [{ normalizedName: 'asc' }, { id: 'asc' }];
    if (sort === 'created') return [{ createdAt: 'desc' }, { id: 'desc' }];
    return [{ lastActivityAt: 'desc' }, { id: 'desc' }];
  }

  cursorWhere(sort: string, cursor?: ContactCursor): Prisma.ContactWhereInput {
    if (!cursor) return {};
    if (sort === 'name')
      return {
        OR: [
          { normalizedName: { gt: cursor.normalizedName } },
          { normalizedName: cursor.normalizedName, id: { gt: cursor.id } },
        ],
      };
    if (sort === 'created') {
      const at = new Date(cursor.createdAt);
      return {
        OR: [
          { createdAt: { lt: at } },
          { createdAt: at, id: { lt: cursor.id } },
        ],
      };
    }
    const at = new Date(cursor.lastActivityAt);
    return {
      OR: [
        { lastActivityAt: { lt: at } },
        { lastActivityAt: at, id: { lt: cursor.id } },
      ],
    };
  }
}
