import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TagRepository {
  constructor(readonly db: PrismaService) {}

  async organizationId() {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  async list(organizationId: string) {
    return this.db.inboxTag.findMany({
      where: { organizationId },
      include: { _count: { select: { conversations: true } } },
      orderBy: [{ active: 'desc' }, { label: 'asc' }],
    });
  }

  async byId(organizationId: string, id: string) {
    return this.db.inboxTag.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { conversations: true } } },
    });
  }

  async codeTaken(organizationId: string, code: string) {
    return (
      (await this.db.inboxTag.count({ where: { organizationId, code } })) > 0
    );
  }
}
