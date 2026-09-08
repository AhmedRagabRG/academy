import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
import { LeadPolicy } from '../../../src/modules/lead-pipeline/lead.policy';
import { PipelineAdminService } from '../../../src/modules/lead-pipeline/pipeline-admin.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const policy = new LeadPolicy();
const service = new PipelineAdminService(prisma as never, policy);

const createdPipelineIds: string[] = [];
let organizationId: string;
let actorId: string;

const caller = (
  permissions = ['pipeline.view', 'pipeline.manage'],
): CallerContext => ({
  accountId: actorId,
  displayName: 'مسؤول الاختبار',
  email: 'pipeline-admin-integration@test.invalid',
  sessionId: 'pipeline-admin-integration',
  roles: [],
  permissionKeys: permissions,
  organizationWide: true,
  authenticatedAt: new Date(0).toISOString(),
});

async function createPipeline(code: string) {
  const pipeline = await service.create(caller(), {
    code,
    name: `مسار ${code}`,
  });
  createdPipelineIds.push(pipeline.id);
  return pipeline;
}

describe('pipeline definition management database contract', () => {
  beforeAll(async () => {
    const organization = await prisma.organization.findFirstOrThrow();
    organizationId = organization.id;
    const account = await prisma.account.findFirstOrThrow({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    actorId = account.id;
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({
      where: { pipelineId: { in: createdPipelineIds } },
    });
    await prisma.pipeline.deleteMany({
      where: { id: { in: createdPipelineIds } },
    });
    await prisma.$disconnect();
  });

  it('creates a non-default pipeline while the seeded default remains untouched', async () => {
    const pipeline = await createPipeline(`test-${Date.now()}-a`);
    expect(pipeline.isDefault).toBe(false);
    expect(pipeline.stages).toHaveLength(0);
  });

  it('makes the first created stage the sole entry stage automatically', async () => {
    const pipeline = await createPipeline(`test-${Date.now()}-b`);
    const withStage = await service.createStage(caller(), pipeline.id, {
      expectedPipelineVersion: pipeline.version,
      code: 'intake',
      name: 'استقبال',
      description: '',
      probability: 0,
      accent: 'slate',
      outcome: 'open',
      isEntry: false,
    });
    expect(withStage.stages).toHaveLength(1);
    expect(withStage.stages[0].isEntry).toBe(true);
  });

  it('keeps exactly one entry stage when a second stage claims entry', async () => {
    const pipeline = await createPipeline(`test-${Date.now()}-c`);
    let current = await service.createStage(caller(), pipeline.id, {
      expectedPipelineVersion: pipeline.version,
      code: 'intake',
      name: 'استقبال',
      description: '',
      probability: 0,
      accent: 'slate',
      outcome: 'open',
      isEntry: false,
    });
    current = await service.createStage(caller(), pipeline.id, {
      expectedPipelineVersion: current.version,
      code: 'follow-up',
      name: 'متابعة',
      description: '',
      probability: 20,
      accent: 'blue',
      outcome: 'open',
      isEntry: true,
    });
    const entries = current.stages.filter((stage) => stage.isEntry);
    expect(entries).toHaveLength(1);
    expect(entries[0].code).toBe('follow-up');
  });

  it('reorders stages, rejects incomplete membership, and rolls back stale versions', async () => {
    const pipeline = await createPipeline(`test-${Date.now()}-d`);
    let current = await service.createStage(caller(), pipeline.id, {
      expectedPipelineVersion: pipeline.version,
      code: 'a',
      name: 'أ',
      description: '',
      probability: 0,
      accent: 'slate',
      outcome: 'open',
      isEntry: false,
    });
    current = await service.createStage(caller(), pipeline.id, {
      expectedPipelineVersion: current.version,
      code: 'b',
      name: 'ب',
      description: '',
      probability: 10,
      accent: 'blue',
      outcome: 'open',
      isEntry: false,
    });
    const [first, second] = current.stages;
    const reordered = await service.reorder(caller(), pipeline.id, {
      expectedPipelineVersion: current.version,
      items: [
        { id: second.id, expectedVersion: second.version },
        { id: first.id, expectedVersion: first.version },
      ],
    });
    expect(reordered.stages.map((stage) => stage.code)).toEqual(['b', 'a']);
    expect(reordered.stages.map((stage) => stage.position)).toEqual([0, 1]);

    await expect(
      service.reorder(caller(), pipeline.id, {
        expectedPipelineVersion: reordered.version,
        items: [{ id: first.id, expectedVersion: first.version }],
      }),
    ).rejects.toMatchObject({ code: 'pipeline-stage-mismatch' });

    await expect(
      service.reorder(caller(), pipeline.id, {
        expectedPipelineVersion: reordered.version - 1,
        items: reordered.stages.map((stage) => ({
          id: stage.id,
          expectedVersion: stage.version,
        })),
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });

    const unchanged = await service.detail(caller(), pipeline.id);
    expect(unchanged.version).toBe(reordered.version);
    expect(unchanged.stages.map((stage) => stage.code)).toEqual(['b', 'a']);
  });

  it('serializes concurrent stage creation through the pipeline aggregate version', async () => {
    const pipeline = await createPipeline(
      `test-${Date.now()}-concurrent-create`,
    );
    const attempts = await Promise.allSettled([
      service.createStage(caller(), pipeline.id, {
        expectedPipelineVersion: pipeline.version,
        code: 'first',
        name: 'الأولى',
        description: '',
        probability: 0,
        accent: 'slate',
        outcome: 'open',
        isEntry: false,
      }),
      service.createStage(caller(), pipeline.id, {
        expectedPipelineVersion: pipeline.version,
        code: 'second',
        name: 'الثانية',
        description: '',
        probability: 0,
        accent: 'blue',
        outcome: 'open',
        isEntry: false,
      }),
    ]);

    expect(
      attempts.filter((attempt) => attempt.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = attempts.find(
      (attempt): attempt is PromiseRejectedResult =>
        attempt.status === 'rejected',
    );
    expect(rejected?.reason).toMatchObject({ code: 'VERSION_CONFLICT' });

    const persisted = await service.detail(caller(), pipeline.id);
    expect(persisted.version).toBe(pipeline.version + 1);
    expect(persisted.stages).toHaveLength(1);
    expect(persisted.stages[0]?.isEntry).toBe(true);
  });

  it('refuses to delete a stage or pipeline that still holds leads', async () => {
    const pipeline = await createPipeline(`test-${Date.now()}-e`);
    const withStage = await service.createStage(caller(), pipeline.id, {
      expectedPipelineVersion: pipeline.version,
      code: 'intake',
      name: 'استقبال',
      description: '',
      probability: 0,
      accent: 'slate',
      outcome: 'open',
      isEntry: false,
    });
    const stage = withStage.stages[0];
    const contact = await prisma.contact.create({
      data: {
        organizationId,
        name: 'عميل اختبار المسارات',
        normalizedName: 'عميل اختبار المسارات',
        phone: `+2001${Date.now()}`,
        normalizedPhone: `1${Date.now()}`,
        source: 'MANUAL',
        ownerName: 'النظام',
        lastActivityAt: new Date(),
      },
    });
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        pipelineId: pipeline.id,
        stageId: stage.id,
        contactId: contact.id,
        currency: 'EGP',
        precision: 2,
      },
    });

    await expect(
      service.removeStage(caller(), pipeline.id, stage.id, {
        expectedPipelineVersion: withStage.version,
        expectedVersion: stage.version,
      }),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_IN_USE' });
    await expect(
      service.remove(caller(), pipeline.id, withStage.version),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_IN_USE' });

    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.contact.delete({ where: { id: contact.id } });
  });

  it('switches the default pipeline atomically and guards the invariant', async () => {
    const seededDefault = await prisma.pipeline.findFirstOrThrow({
      where: { organizationId, isDefault: true },
    });
    const pipeline = await createPipeline(`test-${Date.now()}-f`);
    const withStage = await service.createStage(caller(), pipeline.id, {
      expectedPipelineVersion: pipeline.version,
      code: 'intake',
      name: 'استقبال',
      description: '',
      probability: 0,
      accent: 'slate',
      outcome: 'open',
      isEntry: false,
    });

    await expect(
      service.update(caller(), seededDefault.id, {
        expectedVersion: seededDefault.version,
        isDefault: false,
      }),
    ).rejects.toMatchObject({ code: 'pipeline-default-required' });

    const promoted = await service.update(caller(), pipeline.id, {
      expectedVersion: withStage.version,
      isDefault: true,
    });
    expect(promoted.isDefault).toBe(true);

    const previousDefault = await service.detail(caller(), seededDefault.id);
    expect(previousDefault.isDefault).toBe(false);

    // restore the seeded default so other suites relying on it are unaffected.
    await service.update(caller(), previousDefault.id, {
      expectedVersion: previousDefault.version,
      isDefault: true,
    });
  });

  it('refuses to archive or delete the default pipeline, and refuses non-managers', async () => {
    const seededDefault = await prisma.pipeline.findFirstOrThrow({
      where: { organizationId, isDefault: true },
    });
    await expect(
      service.archive(caller(), seededDefault.id, {
        expectedVersion: seededDefault.version,
      }),
    ).rejects.toMatchObject({ code: 'pipeline-default-archive' });
    await expect(
      service.remove(caller(), seededDefault.id, seededDefault.version),
    ).rejects.toMatchObject({ code: 'pipeline-default-delete' });
    await expect(
      service.create(caller(['pipeline.view']), {
        code: `denied-${Date.now()}`,
        name: 'مرفوض',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
