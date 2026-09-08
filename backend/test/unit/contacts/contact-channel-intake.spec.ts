import { Prisma } from '../../../prisma/generated/client';
import { ContactService } from '../../../src/modules/contacts/contact.service';
import type { ContactPolicy } from '../../../src/modules/contacts/contact.policy';
import type { ContactRepository } from '../../../src/modules/contacts/contact.repository';

const duplicatePhoneError = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['organizationId', 'normalizedPhone'] },
  });

const repository = () => {
  const contact = {
    findUnique: jest.fn().mockResolvedValue(null),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };
  return {
    db: { contact } as unknown as ContactRepository['db'],
    contact,
  };
};

const intake = {
  organizationId: 'organization-id',
  identity: 'messenger:psid-1',
  name: 'عميل واتساب',
  phone: 'psid-1',
  source: 'facebook' as const,
  channelHandle: 'ماسنجر',
  occurredAt: new Date('2026-09-08T10:00:00.000Z'),
};

describe('ContactService.ensureFromChannel', () => {
  it('creates a new contact keyed on the channel identity when none exists', async () => {
    const repo = repository();
    const created = { id: 'contact-1' };
    repo.contact.create.mockResolvedValue(created);
    const service = new ContactService(
      { db: repo.db } as unknown as ContactRepository,
      {} as ContactPolicy,
    );
    const result = await service.ensureFromChannel(intake);
    expect(result).toBe(created);
    expect(repo.contact.create).toHaveBeenCalledTimes(1);
    // Jest exposes call arguments as `any`; narrow the inspected boundary.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const createInput = repo.contact.create.mock.calls[0]?.[0] as unknown as {
      data: { organizationId: string; normalizedPhone: string };
    };
    expect(createInput.data).toMatchObject({
      organizationId: 'organization-id',
      normalizedPhone: 'messenger:psid-1',
    });
  });

  it('reuses the contact a concurrent inbound message already created for the same identity', async () => {
    const repo = repository();
    repo.contact.create.mockRejectedValue(duplicatePhoneError());
    const winner = { id: 'contact-winner' };
    repo.contact.findUniqueOrThrow.mockResolvedValue(winner);
    const service = new ContactService(
      { db: repo.db } as unknown as ContactRepository,
      {} as ContactPolicy,
    );
    const result = await service.ensureFromChannel(intake);
    expect(result).toBe(winner);
    expect(repo.contact.findUniqueOrThrow).toHaveBeenCalledWith({
      where: {
        organizationId_normalizedPhone: {
          organizationId: 'organization-id',
          normalizedPhone: 'messenger:psid-1',
        },
      },
    });
  });

  it('re-throws database errors that are not the identity race', async () => {
    const repo = repository();
    const unrelated = new Prisma.PrismaClientKnownRequestError('boom', {
      code: 'P2003',
      clientVersion: 'test',
    });
    repo.contact.create.mockRejectedValue(unrelated);
    const service = new ContactService(
      { db: repo.db } as unknown as ContactRepository,
      {} as ContactPolicy,
    );
    await expect(service.ensureFromChannel(intake)).rejects.toBe(unrelated);
  });

  it('re-throws a P2002 for a different unique target', async () => {
    const repo = repository();
    const unrelated = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['someOtherField'] },
      },
    );
    repo.contact.create.mockRejectedValue(unrelated);
    const service = new ContactService(
      { db: repo.db } as unknown as ContactRepository,
      {} as ContactPolicy,
    );
    await expect(service.ensureFromChannel(intake)).rejects.toBe(unrelated);
  });
});
