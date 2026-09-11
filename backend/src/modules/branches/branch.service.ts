import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/generated/client';
import {
  DomainException,
  NotFoundException,
  VersionConflictException,
} from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';
import type { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { BranchRepository } from './branch.repository';

type BranchAggregate = NonNullable<
  Awaited<ReturnType<BranchRepository['byId']>>
>;

@Injectable()
export class BranchService {
  constructor(private readonly repo: BranchRepository) {}

  private async project(branch: BranchAggregate) {
    const [ticketCount, memberCount] = await Promise.all([
      this.repo.ticketsReferencing(branch.organizationId, branch.id),
      this.repo.membersOf(branch.id),
    ]);
    return {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      active: branch.status === 'ACTIVE',
      contactCount: branch._count.contacts,
      ticketCount,
      memberCount,
      version: branch.version,
    };
  }

  async list() {
    const organizationId = await this.repo.organizationId();
    const branches = await this.repo.list(organizationId);
    return Promise.all(branches.map((branch) => this.project(branch)));
  }

  private async require(id: string) {
    const organizationId = await this.repo.organizationId();
    const branch = await this.repo.byId(organizationId, id);
    if (!branch) throw new NotFoundException();
    return { organizationId, branch };
  }

  private duplicate(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      // Prisma reports the violated columns as a string[], but the shape is
      // not guaranteed; anything else must not stringify to "[object Object]"
      // and silently pick the wrong message.
      const raw = (error.meta as { target?: unknown } | undefined)?.target;
      const target = Array.isArray(raw)
        ? raw.join(',')
        : typeof raw === 'string'
          ? raw
          : '';
      throw new DomainException(
        target.includes('code')
          ? 'branch-code-duplicate'
          : 'branch-name-duplicate',
        target.includes('code')
          ? 'يوجد فرع بهذا الرمز بالفعل'
          : 'يوجد فرع بهذا الاسم بالفعل',
        409,
      );
    }
    throw error;
  }

  async create(caller: CallerContext, dto: CreateBranchDto) {
    const organizationId = await this.repo.organizationId();
    try {
      const created = await this.repo.db.branch.create({
        data: {
          organizationId,
          code: dto.code,
          name: dto.name,
          address: dto.address ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          createdBy: caller.accountId,
          updatedBy: caller.accountId,
        },
        include: { _count: { select: { contacts: true } } },
      });
      return this.project(created);
    } catch (error) {
      this.duplicate(error);
    }
  }

  async update(caller: CallerContext, id: string, dto: UpdateBranchDto) {
    const { branch } = await this.require(id);
    const { expectedVersion, active, ...fields } = dto;
    try {
      // The version guard lives in the predicate so two concurrent saves
      // cannot both observe the same version and both win.
      const result = await this.repo.db.branch.updateMany({
        where: { id: branch.id, version: expectedVersion },
        data: {
          ...fields,
          ...(active === undefined
            ? {}
            : { status: active ? 'ACTIVE' : 'INACTIVE' }),
          updatedBy: caller.accountId,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) {
        const latest = await this.repo.byId(branch.organizationId, id);
        throw new VersionConflictException(latest?.version ?? expectedVersion);
      }
    } catch (error) {
      if (error instanceof VersionConflictException) throw error;
      this.duplicate(error);
    }
    return this.byId(id);
  }

  async byId(id: string) {
    const { branch } = await this.require(id);
    return this.project(branch);
  }

  /**
   * Contact.branchId nulls out on delete, but Ticket.branchId is a bare uuid
   * with no constraint and Account.branchIds is a plain array — neither would
   * notice the row disappearing. Refusing while either still points at the
   * branch keeps those references honest; deactivating is the usual intent.
   */
  async remove(id: string) {
    const { organizationId, branch } = await this.require(id);
    const [tickets, members] = await Promise.all([
      this.repo.ticketsReferencing(organizationId, branch.id),
      this.repo.membersOf(branch.id),
    ]);
    if (tickets > 0 || members > 0)
      throw new DomainException(
        'branch-in-use',
        `لا يمكن حذف الفرع لارتباطه بـ ${tickets} تذكرة و ${members} موظف. عطّله بدلًا من حذفه.`,
        409,
      );
    await this.repo.db.branch.delete({ where: { id: branch.id } });
  }

  async accounts() {
    return (await this.repo.accountsWithBranches()).map((account) => ({
      accountId: account.id,
      displayName: account.displayName,
      branchIds: account.branchIds,
      organizationWide: account.organizationWide,
    }));
  }

  /** Replaces an account's branch list. An empty list means unrestricted. */
  async setAccountBranches(accountId: string, branchIds: string[]) {
    const organizationId = await this.repo.organizationId();
    if (branchIds.length) {
      const found = await this.repo.db.branch.count({
        where: { id: { in: branchIds }, organizationId },
      });
      if (found !== branchIds.length)
        throw new DomainException(
          'branch-unknown',
          'أحد الفروع غير موجود',
          422,
        );
    }
    const account = await this.repo.db.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException();
    await this.repo.db.account.update({
      where: { id: accountId },
      data: { branchIds },
    });
    return { accountId, branchIds };
  }
}
