import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/generated/client';
import { DomainException, NotFoundException } from '../../core/exceptions';
import type { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { TeamRepository } from './team.repository';

type TeamAggregate = NonNullable<Awaited<ReturnType<TeamRepository['byId']>>>;

@Injectable()
export class TeamService {
  constructor(private readonly repo: TeamRepository) {}

  private async project(team: TeamAggregate) {
    const accounts = await this.repo.accountsById(
      team.memberships.map((row) => row.employeeId),
    );
    return {
      id: team.id,
      name: team.name,
      active: team.active,
      memberCount: team.memberships.filter((row) => row.active).length,
      members: team.memberships.map((row) => ({
        employeeId: row.employeeId,
        // A membership can outlive the account it points at, because there is
        // no foreign key. Say so rather than rendering a blank row.
        displayName: accounts.get(row.employeeId)?.displayName ?? 'حساب محذوف',
        active: row.active,
      })),
      createdAt: team.createdAt.toISOString(),
    };
  }

  async list() {
    const organizationId = await this.repo.organizationId();
    const teams = await this.repo.list(organizationId);
    return Promise.all(teams.map((team) => this.project(team)));
  }

  private async require(id: string) {
    const organizationId = await this.repo.organizationId();
    const team = await this.repo.byId(organizationId, id);
    if (!team) throw new NotFoundException();
    return { organizationId, team };
  }

  async create(dto: CreateTeamDto) {
    const organizationId = await this.repo.organizationId();
    try {
      const created = await this.repo.db.ticketTeam.create({
        data: { organizationId, name: dto.name },
        include: { memberships: true },
      });
      return this.project(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        // DuplicateException takes a machine code, not a message — passing the
        // Arabic text here would surface it as the error code.
        throw new DomainException(
          'team-name-duplicate',
          'يوجد فريق بهذا الاسم بالفعل',
          409,
        );
      throw error;
    }
  }

  async update(id: string, dto: UpdateTeamDto) {
    const { team } = await this.require(id);
    if (dto.name === undefined && dto.active === undefined)
      throw new DomainException('no-op', 'لا يوجد تغيير', 409);
    try {
      const updated = await this.repo.db.ticketTeam.update({
        where: { id: team.id },
        data: {
          ...(dto.name === undefined ? {} : { name: dto.name }),
          ...(dto.active === undefined ? {} : { active: dto.active }),
        },
        include: { memberships: true },
      });
      return this.project(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        // DuplicateException takes a machine code, not a message — passing the
        // Arabic text here would surface it as the error code.
        throw new DomainException(
          'team-name-duplicate',
          'يوجد فريق بهذا الاسم بالفعل',
          409,
        );
      throw error;
    }
  }

  /**
   * Ticket.teamId is a bare uuid with no foreign key, so deleting a team that
   * tickets still point at would leave them referencing a row that no longer
   * exists — invisible until someone opens the ticket. Deactivating keeps the
   * history readable and takes the team out of every picker, which is what
   * "remove a team" almost always means in practice.
   */
  async remove(id: string) {
    const { organizationId, team } = await this.require(id);
    const tickets = await this.repo.ticketsReferencing(organizationId, team.id);
    const conversations = await this.repo.conversationsReferencing(
      organizationId,
      team.id,
    );
    if (tickets > 0 || conversations > 0)
      throw new DomainException(
        'team-in-use',
        `لا يمكن حذف الفريق لارتباطه بـ ${tickets} تذكرة و ${conversations} محادثة. عطّله بدلًا من حذفه.`,
        409,
      );
    await this.repo.db.ticketTeam.delete({ where: { id: team.id } });
  }

  async addMember(id: string, employeeId: string) {
    const { team } = await this.require(id);
    const account = await this.repo.db.account.findFirst({
      where: { id: employeeId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!account)
      throw new DomainException(
        'employee-inactive',
        'الموظف غير موجود أو غير نشط',
        422,
      );
    await this.repo.db.ticketTeamMembership.upsert({
      where: { teamId_employeeId: { teamId: team.id, employeeId } },
      update: { active: true },
      create: { teamId: team.id, employeeId },
    });
    return this.byId(team.id);
  }

  async removeMember(id: string, employeeId: string) {
    const { team } = await this.require(id);
    await this.repo.db.ticketTeamMembership.deleteMany({
      where: { teamId: team.id, employeeId },
    });
    return this.byId(team.id);
  }

  async byId(id: string) {
    const { team } = await this.require(id);
    return this.project(team);
  }
}
