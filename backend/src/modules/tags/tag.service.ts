import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../prisma/generated/client';
import { DomainException, NotFoundException } from '../../core/exceptions';
import type { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { TagRepository } from './tag.repository';

type TagAggregate = NonNullable<Awaited<ReturnType<TagRepository['byId']>>>;

@Injectable()
export class TagService {
  constructor(private readonly repo: TagRepository) {}

  private project(tag: TagAggregate) {
    return {
      id: tag.id,
      label: tag.label,
      color: tag.color,
      active: tag.active,
      usageCount: tag._count.conversations,
    };
  }

  /**
   * `code` is the row's machine key and is never shown or edited, so it is
   * derived here rather than asked for. Latin labels slugify readably; an
   * Arabic label leaves nothing usable, so those fall back to a short opaque
   * key. Uniqueness is per organization, so a collision just retries.
   */
  private async uniqueCode(organizationId: string, label: string) {
    const base =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || `tag-${randomUUID().slice(0, 8)}`;
    let code = base;
    let suffix = 1;
    while (await this.repo.codeTaken(organizationId, code)) {
      suffix += 1;
      code = `${base}-${suffix}`;
    }
    return code;
  }

  async list() {
    const organizationId = await this.repo.organizationId();
    return (await this.repo.list(organizationId)).map((tag) =>
      this.project(tag),
    );
  }

  private async require(id: string) {
    const organizationId = await this.repo.organizationId();
    const tag = await this.repo.byId(organizationId, id);
    if (!tag) throw new NotFoundException();
    return { organizationId, tag };
  }

  private duplicateLabel(): never {
    throw new DomainException(
      'tag-label-duplicate',
      'يوجد وسم بهذا الاسم بالفعل',
      409,
    );
  }

  async create(dto: CreateTagDto) {
    const organizationId = await this.repo.organizationId();
    const existing = await this.repo.db.inboxTag.count({
      where: { organizationId, label: dto.label },
    });
    if (existing) this.duplicateLabel();
    const created = await this.repo.db.inboxTag.create({
      data: {
        organizationId,
        code: await this.uniqueCode(organizationId, dto.label),
        label: dto.label,
        color: dto.color,
      },
      include: { _count: { select: { conversations: true } } },
    });
    return this.project(created);
  }

  async update(id: string, dto: UpdateTagDto) {
    const { organizationId, tag } = await this.require(id);
    if (
      dto.label === undefined &&
      dto.color === undefined &&
      dto.active === undefined
    )
      throw new DomainException('no-op', 'لا يوجد تغيير', 409);
    if (dto.label !== undefined && dto.label !== tag.label) {
      const clash = await this.repo.db.inboxTag.count({
        where: { organizationId, label: dto.label, id: { not: tag.id } },
      });
      if (clash) this.duplicateLabel();
    }
    const updated = await this.repo.db.inboxTag.update({
      where: { id: tag.id },
      data: {
        ...(dto.label === undefined ? {} : { label: dto.label }),
        ...(dto.color === undefined ? {} : { color: dto.color }),
        ...(dto.active === undefined ? {} : { active: dto.active }),
      },
      include: { _count: { select: { conversations: true } } },
    });
    return this.project(updated);
  }

  /**
   * InboxConversationTag restricts deletion at the database level, so a tag in
   * use cannot be removed by accident. The count is checked first purely to
   * turn an opaque constraint violation into something an admin can act on:
   * deactivating hides the tag from every picker while leaving the
   * conversations it was applied to intact.
   */
  async remove(id: string) {
    const { tag } = await this.require(id);
    if (tag._count.conversations > 0)
      throw new DomainException(
        'tag-in-use',
        `لا يمكن حذف الوسم لاستخدامه في ${tag._count.conversations} محادثة. عطّله بدلًا من حذفه.`,
        409,
      );
    try {
      await this.repo.db.inboxTag.delete({ where: { id: tag.id } });
    } catch (error) {
      // A conversation could be tagged between the count and the delete.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      )
        throw new DomainException(
          'tag-in-use',
          'تم استخدام الوسم للتو في محادثة. عطّله بدلًا من حذفه.',
          409,
        );
      throw error;
    }
  }
}
