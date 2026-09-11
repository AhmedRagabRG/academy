import {
  DomainException,
  NotFoundException,
} from '../../../src/core/exceptions';
import { TeamService } from '../../../src/modules/teams/team.service';
import type { TeamRepository } from '../../../src/modules/teams/team.repository';
import { Prisma } from '../../../prisma/generated/client';

const team = (overrides: Record<string, unknown> = {}) => ({
  id: 'team-1',
  organizationId: 'org-1',
  name: 'فريق الدعم',
  active: true,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  memberships: [{ teamId: 'team-1', employeeId: 'acc-1', active: true }],
  ...overrides,
});

const duplicate = () =>
  new Prisma.PrismaClientKnownRequestError('dup', {
    code: 'P2002',
    clientVersion: 'test',
  });

const harness = (overrides: Record<string, unknown> = {}) => {
  const db = {
    ticketTeam: {
      create: jest.fn().mockResolvedValue(team()),
      update: jest.fn().mockResolvedValue(team()),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    ticketTeamMembership: {
      upsert: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    account: {
      findFirst: jest.fn().mockResolvedValue({ id: 'acc-1' }),
    },
  };
  const repo = {
    db,
    organizationId: jest.fn().mockResolvedValue('org-1'),
    list: jest.fn().mockResolvedValue([team()]),
    byId: jest.fn().mockResolvedValue(team()),
    accountsById: jest
      .fn()
      .mockResolvedValue(new Map([['acc-1', { displayName: 'أحمد' }]])),
    ticketsReferencing: jest.fn().mockResolvedValue(0),
    conversationsReferencing: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as TeamRepository;
  return { service: new TeamService(repo), repo, db };
};

describe('TeamService', () => {
  it('lists teams with resolved member names', async () => {
    const { service } = harness();
    const [first] = await service.list();
    expect(first?.members[0]?.displayName).toBe('أحمد');
    expect(first?.memberCount).toBe(1);
  });

  it('labels a membership whose account no longer exists', async () => {
    // employeeId has no foreign key to Account, so this really can happen.
    const { service } = harness({
      accountsById: jest.fn().mockResolvedValue(new Map()),
    });
    const [first] = await service.list();
    expect(first?.members[0]?.displayName).toBe('حساب محذوف');
  });

  it('rejects a duplicate team name with a machine code, not Arabic prose', async () => {
    const { service, db } = harness();
    db.ticketTeam.create.mockRejectedValueOnce(duplicate());
    await expect(service.create({ name: 'فريق الدعم' })).rejects.toMatchObject({
      code: 'team-name-duplicate',
    });
  });

  it('404s for a team outside the organization', async () => {
    const { service } = harness({ byId: jest.fn().mockResolvedValue(null) });
    await expect(
      service.update('nope', { active: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an empty update rather than bumping nothing', async () => {
    const { service } = harness();
    await expect(service.update('team-1', {})).rejects.toBeInstanceOf(
      DomainException,
    );
  });

  /**
   * Ticket.teamId is a bare uuid with no foreign key, so a delete would leave
   * tickets pointing at a row that no longer exists — and nothing in the
   * database would complain.
   */
  it('refuses to delete a team that tickets still reference', async () => {
    const { service, db } = harness({
      ticketsReferencing: jest.fn().mockResolvedValue(3),
    });
    await expect(service.remove('team-1')).rejects.toBeInstanceOf(
      DomainException,
    );
    expect(db.ticketTeam.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete a team still assigned to a conversation', async () => {
    const { service, db } = harness({
      conversationsReferencing: jest.fn().mockResolvedValue(1),
    });
    await expect(service.remove('team-1')).rejects.toBeInstanceOf(
      DomainException,
    );
    expect(db.ticketTeam.delete).not.toHaveBeenCalled();
  });

  it('deletes a team nothing references', async () => {
    const { service, db } = harness();
    await service.remove('team-1');
    expect(db.ticketTeam.delete).toHaveBeenCalledWith({
      where: { id: 'team-1' },
    });
  });

  it('refuses to add an inactive or unknown employee', async () => {
    const { service, db } = harness();
    db.account.findFirst.mockResolvedValueOnce(null);
    await expect(service.addMember('team-1', 'ghost')).rejects.toBeInstanceOf(
      DomainException,
    );
    expect(db.ticketTeamMembership.upsert).not.toHaveBeenCalled();
  });

  it('re-activates rather than duplicating an existing membership', async () => {
    const { service, db } = harness();
    await service.addMember('team-1', 'acc-1');
    expect(db.ticketTeamMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { active: true } }),
    );
  });
});
