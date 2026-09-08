import { Prisma } from '../../../prisma/generated/client';
import type { PrismaService } from '../../../src/database/prisma.service';
import type { LeadPolicy } from '../../../src/modules/lead-pipeline/lead.policy';
import { LeadService } from '../../../src/modules/lead-pipeline/lead.service';

const pipeline = {
  id: 'pipeline-id',
  stages: [
    {
      id: 'stage-id',
      isEntry: true,
    },
  ],
};

const intake = {
  organizationId: 'organization-id',
  contactId: 'contact-id',
  occurredAt: new Date('2026-09-08T10:00:00.000Z'),
};

const database = () => {
  const lead = {
    findFirst: jest.fn(),
    create: jest.fn(),
  };
  const db = {
    pipeline: { findFirst: jest.fn().mockResolvedValue(pipeline) },
    generalSettings: {
      findFirst: jest.fn().mockResolvedValue({ currency: 'EGP' }),
    },
    lead,
    $transaction: jest.fn(
      (callback: (tx: { lead: typeof lead }) => Promise<unknown>) =>
        callback({ lead }),
    ),
  };
  return { db, lead };
};

const service = (db: ReturnType<typeof database>['db']) =>
  new LeadService(db as unknown as PrismaService, {} as LeadPolicy);

describe('LeadService.ensureFromChannel', () => {
  it('creates a channel lead in a serializable transaction', async () => {
    const { db, lead } = database();
    const created = { id: 'lead-id' };
    lead.findFirst.mockResolvedValue(null);
    lead.create.mockResolvedValue(created);

    await expect(service(db).ensureFromChannel(intake)).resolves.toBe(created);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(lead.create).toHaveBeenCalledTimes(1);
    // Jest exposes call arguments as `any`; narrow the inspected boundary.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const createInput = lead.create.mock.calls[0]?.[0] as unknown as {
      data: { pipelineId: string; contactId: string; stageId: string };
    };
    expect(createInput.data).toMatchObject({
      pipelineId: 'pipeline-id',
      contactId: 'contact-id',
      stageId: 'stage-id',
    });
  });

  it('retries a serialization conflict and reuses the winner lead', async () => {
    const { db, lead } = database();
    const conflict = new Prisma.PrismaClientKnownRequestError(
      'Transaction conflict',
      { code: 'P2034', clientVersion: 'test' },
    );
    const winner = { id: 'winner-lead' };
    db.$transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(
        (callback: (tx: { lead: typeof lead }) => Promise<unknown>) =>
          callback({ lead }),
      );
    lead.findFirst.mockResolvedValue(winner);

    await expect(service(db).ensureFromChannel(intake)).resolves.toBe(winner);
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(lead.create).not.toHaveBeenCalled();
  });

  it('does not hide a second serialization failure', async () => {
    const { db } = database();
    const conflict = new Prisma.PrismaClientKnownRequestError(
      'Transaction conflict',
      { code: 'P2034', clientVersion: 'test' },
    );
    db.$transaction.mockRejectedValue(conflict);

    await expect(service(db).ensureFromChannel(intake)).rejects.toBe(conflict);
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });
});
