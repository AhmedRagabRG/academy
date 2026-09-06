import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DomainException } from '../../core/exceptions';
import { PrismaService } from '../../database/prisma.service';
import type { CampaignListDto, RecipientListDto } from './dto/campaign.dto';

export interface KeysetCursor {
  v: 1;
  fingerprint: string;
  id: string;
  snapshotAt: string;
  createdAt: string;
}

@Injectable()
export class CampaignRepository {
  constructor(readonly db: PrismaService) {}

  async organizationId(): Promise<string> {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  fingerprint(query: CampaignListDto | RecipientListDto): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          search: query.search.trim().toLocaleLowerCase(),
          status: query.status ?? '',
          templateId: 'templateId' in query ? (query.templateId ?? '') : '',
          limit: query.limit,
        }),
      )
      .digest('base64url')
      .slice(0, 20);
  }

  encode(value: KeysetCursor): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  decode(
    value: string | undefined,
    fingerprint: string,
  ): KeysetCursor | undefined {
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as KeysetCursor;
      if (
        parsed.v !== 1 ||
        !parsed.id ||
        Number.isNaN(Date.parse(parsed.snapshotAt)) ||
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

  /** Newest first, tie-broken by id so a page boundary is never ambiguous. */
  cursorWhere(cursor?: KeysetCursor) {
    if (!cursor) return {};
    const at = new Date(cursor.createdAt);
    return {
      OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: cursor.id } }],
    };
  }
}
