import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../../prisma/generated/client';
import {
  normalizeName,
  normalizePhone,
} from '../../../src/modules/contacts/contact.repository';
import type { ContactService } from '../../../src/modules/contacts/contact.service';
import { ChannelCredentialsService } from '../../../src/modules/inbox/channels/channel-credentials.service';
import { CampaignPolicy } from '../../../src/modules/campaigns/campaign.policy';
import { CampaignRepository } from '../../../src/modules/campaigns/campaign.repository';
import { CampaignService } from '../../../src/modules/campaigns/campaign.service';
import { CampaignDispatcherService } from '../../../src/modules/campaigns/dispatch/campaign-dispatcher.service';
import { CampaignDeliveryListener } from '../../../src/modules/campaigns/dispatch/campaign-delivery.listener';
import {
  TemplateSendError,
  type TemplateSendRequest,
  type WhatsappTemplateSender,
} from '../../../src/modules/campaigns/dispatch/whatsapp-template.sender';
import { WhatsappTemplateService } from '../../../src/modules/campaigns/templates/whatsapp-template.service';
import type { MetaGraphClient } from '../../../src/modules/inbox/channels/meta-graph.client';
import type { MetaMessageStatusEvent } from '../../../src/core/events/meta-message-status.event';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const config = new ConfigService({
  campaigns: { tickMs: 5000, maxPerTick: 100, dispatchEnabled: true },
  meta: { graphVersion: 'v25.0' },
});

/** A controllable stand-in for the real Graph API call. Never performs
 * network I/O; the reliability guarantees under test live entirely in the
 * dispatcher's database reads/writes around this call. */
class FakeSender {
  readonly calls: TemplateSendRequest[] = [];
  handler: (request: TemplateSendRequest) => Promise<string> = () =>
    Promise.resolve(`wamid-${randomUUID()}`);

  channel(): Promise<{
    platformCode: 'whatsapp';
    providerAccountId: string;
    accessToken: string;
  }> {
    return Promise.resolve({
      platformCode: 'whatsapp',
      providerAccountId: 'phone-id',
      accessToken: 'wa-token',
    });
  }

  send(request: TemplateSendRequest): Promise<string> {
    this.calls.push(request);
    return this.handler(request);
  }
}

const asSender = (sender: FakeSender) =>
  sender as unknown as WhatsappTemplateSender;

let organizationId: string;
let actorId: string;
let templateId: string;
const ownedCampaignIds: string[] = [];
const ownedGroupIds: string[] = [];
const ownedContactIds: string[] = [];

const caller = (): CallerContext => ({
  accountId: actorId,
  displayName: 'مسؤول التوزيع',
  email: 'dispatch@test.invalid',
  sessionId: 'dispatch-integration',
  roles: [],
  permissionKeys: [
    'campaigns.view',
    'campaigns.create',
    'campaigns.update',
    'campaigns.launch',
  ],
  organizationWide: true,
  authenticatedAt: new Date(0).toISOString(),
});

async function createCampaign(
  overrides: Partial<{
    status: 'RUNNING' | 'SCHEDULED' | 'PAUSED';
    throttlePerMinute: number;
    scheduledAt: Date;
  }> = {},
) {
  const campaign = await prisma.campaign.create({
    data: {
      organizationId,
      name: `حملة اختبار ${randomUUID()}`,
      normalizedName: normalizeName(`حملة اختبار ${randomUUID()}`),
      templateId,
      status: overrides.status ?? 'RUNNING',
      throttlePerMinute: overrides.throttlePerMinute ?? 6000,
      startedAt: overrides.status === 'SCHEDULED' ? null : new Date(),
      scheduledAt: overrides.scheduledAt,
      createdById: actorId,
      createdByName: 'مسؤول التوزيع',
    },
  });
  ownedCampaignIds.push(campaign.id);
  return campaign;
}

let phoneSeq = 0;
async function createPendingRecipients(campaignId: string, count: number) {
  const rows = Array.from({ length: count }, () => {
    phoneSeq += 1;
    const digits = `2010${String(phoneSeq).padStart(8, '0')}`;
    return {
      campaignId,
      name: `مستلم ${phoneSeq}`,
      phone: `+${digits}`,
      normalizedPhone: digits,
      variables: [],
      headerVariables: [],
    };
  });
  await prisma.campaignRecipient.createMany({ data: rows });
  return prisma.campaignRecipient.findMany({
    where: { campaignId },
    orderBy: { normalizedPhone: 'asc' },
  });
}

const repo = new CampaignRepository(prisma as never);
const policy = new CampaignPolicy();
const credentials = new ChannelCredentialsService(
  prisma as never,
  new ConfigService({
    meta: {
      whatsappPhoneNumberId: 'test-phone-id',
      whatsappAccessToken: 'test-access-token',
      whatsappBusinessAccountId: 'test-waba-id',
    },
  }),
);
const templates = new WhatsappTemplateService(
  prisma as never,
  {} as unknown as MetaGraphClient,
  credentials,
  policy,
);
const contactsStub = { import: jest.fn() } as unknown as ContactService;

describe('Campaign dispatch reliability (real Postgres)', () => {
  beforeAll(async () => {
    organizationId = (await prisma.organization.findFirstOrThrow()).id;
    actorId = (
      await prisma.account.findFirstOrThrow({ where: { status: 'ACTIVE' } })
    ).id;
    const template = await prisma.whatsappTemplate.create({
      data: {
        organizationId,
        wabaId: 'waba-test',
        providerTemplateId: `tpl-dispatch-${randomUUID()}`,
        name: 'dispatch_reliability',
        language: 'ar',
        category: 'MARKETING',
        status: 'APPROVED',
        bodyText: 'رسالة اختبار',
        variableCount: 0,
        headerVariableCount: 0,
        syncedAt: new Date(),
      },
    });
    templateId = template.id;
  });

  afterAll(async () => {
    if (ownedCampaignIds.length)
      await prisma.campaign.deleteMany({
        where: { id: { in: ownedCampaignIds } },
      });
    if (ownedContactIds.length) {
      await prisma.contactGroupMember.deleteMany({
        where: { contactId: { in: ownedContactIds } },
      });
      await prisma.contact.deleteMany({
        where: { id: { in: ownedContactIds } },
      });
    }
    if (ownedGroupIds.length)
      await prisma.contactGroup.deleteMany({
        where: { id: { in: ownedGroupIds } },
      });
    await prisma.whatsappTemplate.deleteMany({
      where: { providerTemplateId: { startsWith: 'tpl-dispatch-' } },
    });
    await prisma.$disconnect();
  });

  it('never sends a recipient twice when two worker instances race the same claim', async () => {
    const campaign = await createCampaign();
    await createPendingRecipients(campaign.id, 6);
    const senderA = new FakeSender();
    const senderB = new FakeSender();
    const workerA = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(senderA),
    );
    const workerB = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(senderB),
    );

    await Promise.all([workerA.tick(), workerB.tick()]);

    const seen = [...senderA.calls, ...senderB.calls].map((c) => c.to);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toHaveLength(6);
    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
    });
    expect(recipients.every((r) => r.status === 'SENT')).toBe(true);
    expect(new Set(recipients.map((r) => r.providerMessageId)).size).toBe(6);
  });

  it('never sends a recipient twice when duplicate ticks race the same campaign', async () => {
    const campaign = await createCampaign();
    await createPendingRecipients(campaign.id, 6);
    const sender = new FakeSender();
    const worker = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(sender),
    );
    const fresh = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
      include: { template: true },
    });

    // Bypasses the dispatcher's own same-instance tick mutex to directly
    // stress the lower-level SKIP LOCKED claim, as two overlapping jobs
    // (e.g. a slow tick plus a retriggered one) would.
    const advance = (
      worker as unknown as {
        advance: (c: typeof fresh) => Promise<void>;
      }
    ).advance.bind(worker);
    await Promise.all([advance(fresh), advance(fresh)]);

    expect(sender.calls).toHaveLength(6);
    expect(new Set(sender.calls.map((c) => c.to)).size).toBe(6);
  });

  it('reclaims a pre-send claim abandoned by a crash and sends it exactly once', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'SENDING',
        claimToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() - 1000),
        requestStartedAt: null,
        attempts: 0,
      },
    });
    const sender = new FakeSender();
    const worker = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(sender),
    );

    await worker.tick();

    const resolved = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(resolved.status).toBe('SENT');
    expect(resolved.attempts).toBe(1);
    expect(resolved.claimToken).toBeNull();
    expect(sender.calls).toHaveLength(1);
  });

  it('resolves a claim abandoned after the request started to UNCERTAIN and never resends it', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'SENDING',
        claimToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() - 1000),
        requestStartedAt: new Date(Date.now() - 2000),
        attempts: 1,
      },
    });
    const sender = new FakeSender();
    const worker = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(sender),
    );

    await worker.tick();
    const resolved = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(resolved.status).toBe('UNCERTAIN');
    expect(resolved.uncertainAt).not.toBeNull();
    expect(resolved.claimToken).toBeNull();
    const refreshedCampaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    expect(refreshedCampaign.uncertainCount).toBe(1);

    // A second pass must never resend: the row is no longer PENDING.
    await worker.tick();
    expect(sender.calls).toHaveLength(0);
  });

  it('simulates a restart: a brand-new worker recovers mixed in-flight state without double-sending', async () => {
    const campaign = await createCampaign();
    const rows = await createPendingRecipients(campaign.id, 2);
    await prisma.campaignRecipient.update({
      where: { id: rows[0].id },
      data: {
        status: 'SENDING',
        claimToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() - 1000),
        requestStartedAt: null,
        attempts: 0,
      },
    });
    await prisma.campaignRecipient.update({
      where: { id: rows[1].id },
      data: {
        status: 'SENDING',
        claimToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() - 1000),
        requestStartedAt: new Date(Date.now() - 2000),
        attempts: 1,
      },
    });
    const sender = new FakeSender();
    // A fresh instance: no in-memory state survives a restart, by design —
    // everything a worker needs is in the database.
    const restarted = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(sender),
    );

    await restarted.tick();

    const unstarted = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: rows[0].id },
    });
    const started = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: rows[1].id },
    });
    expect(unstarted.status).toBe('SENT');
    expect(started.status).toBe('UNCERTAIN');
    expect(sender.calls).toHaveLength(1);
  });

  it('never treats a database failure after a confirmed send as a send failure', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    const sender = new FakeSender();
    sender.handler = () => Promise.resolve('wamid-db-failure-1');
    const worker = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(sender),
    );
    // `tick()` also calls `updateMany` for unrelated housekeeping (stale-lease
    // recovery). Only the exact write that would persist this recipient's
    // confirmed send is made to fail, and only once.
    const originalUpdateMany = prisma.campaignRecipient.updateMany.bind(
      prisma.campaignRecipient,
    );
    let injectFailure = true;
    const updateManySpy = jest
      .spyOn(prisma.campaignRecipient, 'updateMany')
      .mockImplementation((args: unknown) => {
        const call = args as {
          where?: { id?: string };
          data?: { status?: string };
        };
        if (
          injectFailure &&
          call.where?.id === recipient.id &&
          call.data?.status === 'SENT'
        ) {
          injectFailure = false;
          return Promise.reject(new Error('simulated database outage'));
        }
        return originalUpdateMany(args as never);
      });

    await worker.tick();
    updateManySpy.mockRestore();

    const row = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(row.status).toBe('SENDING');
    expect(row.providerMessageId).toBeNull();
    expect(row.requestStartedAt).not.toBeNull();
    const campaignAfterFailure = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    expect(campaignAfterFailure.sentCount).toBe(0);

    // Time passes; the lease lapses. The row must heal to UNCERTAIN, never FAILED.
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { leaseExpiresAt: new Date(Date.now() - 1000) },
    });
    await worker.tick();
    const healed = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(healed.status).toBe('UNCERTAIN');
    expect(sender.calls).toHaveLength(1);
  });

  it('reconciles a late webhook against an uncertain recipient via its correlation id', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: 'UNCERTAIN', uncertainAt: new Date() },
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { uncertainCount: 1 },
    });
    const listener = new CampaignDeliveryListener(prisma as never);

    await listener.apply({
      providerMessageId: 'wamid-late-reconcile-1',
      correlationId: recipient.correlationId,
      state: 'delivered',
      occurredAt: new Date().toISOString(),
    });

    const resolved = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(resolved.status).toBe('DELIVERED');
    expect(resolved.providerMessageId).toBe('wamid-late-reconcile-1');
    expect(resolved.deliveredAt).not.toBeNull();
    const refreshedCampaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    expect(refreshedCampaign.deliveredCount).toBe(1);
    expect(refreshedCampaign.sentCount).toBe(1);
    expect(refreshedCampaign.uncertainCount).toBe(0);
  });

  it('applies duplicate and out-of-order receipts with exact, non-drifting counters', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'SENT',
        providerMessageId: 'wamid-order-1',
        sentAt: new Date(),
      },
    });
    const listener = new CampaignDeliveryListener(prisma as never);
    const event = (
      overrides: Partial<MetaMessageStatusEvent>,
    ): MetaMessageStatusEvent => ({
      providerMessageId: 'wamid-order-1',
      state: 'sent',
      occurredAt: new Date().toISOString(),
      ...overrides,
    });

    await listener.apply(event({ state: 'delivered' }));
    await listener.apply(event({ state: 'delivered' })); // duplicate
    await listener.apply(event({ state: 'read' }));
    await listener.apply(event({ state: 'delivered' })); // stale, out of order
    await listener.apply(event({ state: 'failed', errorCode: '131026' })); // must not regress READ

    const resolved = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(resolved.status).toBe('READ');
    const campaignAfter = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    expect(campaignAfter.deliveredCount).toBe(1);
    expect(campaignAfter.readCount).toBe(1);
    expect(campaignAfter.failedCount).toBe(0);
  });

  it('serializes concurrent delivered/read receipts without double-counting delivery', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'SENT',
        providerMessageId: 'wamid-concurrent-receipts-1',
        sentAt: new Date(),
      },
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { sentCount: 1 },
    });
    const listener = new CampaignDeliveryListener(prisma as never);
    const base = {
      providerMessageId: 'wamid-concurrent-receipts-1',
      occurredAt: new Date().toISOString(),
    } as const;

    await Promise.all([
      listener.apply({ ...base, state: 'delivered' }),
      listener.apply({ ...base, state: 'read' }),
    ]);

    const resolved = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    const campaignAfter = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    expect(resolved.status).toBe('READ');
    expect(campaignAfter.deliveredCount).toBe(1);
    expect(campaignAfter.readCount).toBe(1);
  });

  it('lets a later delivered receipt supersede an earlier failure', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'FAILED',
        providerMessageId: 'wamid-supersede-1',
        sentAt: new Date(),
        failedAt: new Date(),
        errorCode: '131026',
      },
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { sentCount: 1, failedCount: 1 },
    });
    const listener = new CampaignDeliveryListener(prisma as never);

    await listener.apply({
      providerMessageId: 'wamid-supersede-1',
      state: 'delivered',
      occurredAt: new Date().toISOString(),
    });

    const resolved = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(resolved.status).toBe('DELIVERED');
    const campaignAfter = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    expect(campaignAfter.deliveredCount).toBe(1);
    expect(campaignAfter.failedCount).toBe(0);
  });

  it('retries an explicit transient refusal with backoff up to the attempt cap, then fails permanently', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    const sender = new FakeSender();
    sender.handler = () =>
      Promise.reject(
        new TemplateSendError('130429', 'throughput', 'explicit-retryable'),
      );
    const worker = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(sender),
    );

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await worker.tick();
      await prisma.campaignRecipient.updateMany({
        where: { id: recipient.id, status: 'PENDING' },
        data: { availableAt: new Date() },
      });
    }
    // The campaign is already terminal after the fifth attempt; another
    // tick proves it cannot accidentally send a sixth time.
    await worker.tick();

    const resolved = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(resolved.status).toBe('FAILED');
    expect(resolved.attempts).toBeGreaterThanOrEqual(5);
    expect(sender.calls.length).toBe(resolved.attempts);
  });

  it('resolves an ambiguous network failure to UNCERTAIN without retrying', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    const sender = new FakeSender();
    sender.handler = () =>
      Promise.reject(
        new TemplateSendError('network', 'ECONNRESET', 'ambiguous'),
      );
    const worker = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(sender),
    );

    await worker.tick();

    const resolved = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(resolved.status).toBe('UNCERTAIN');
    expect(resolved.attempts).toBe(1);
    const campaignAfter = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    expect(campaignAfter.uncertainCount).toBe(1);

    await worker.tick();
    expect(sender.calls).toHaveLength(1); // never resent
  });

  it('promotes a scheduled campaign exactly once when two workers race it', async () => {
    const campaign = await createCampaign({
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() - 1000),
    });
    const workerA = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(new FakeSender()),
    );
    const workerB = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(new FakeSender()),
    );

    await Promise.all([workerA.tick(), workerB.tick()]);

    const resolved = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    // Zero materialized recipients means the same tick that promotes it may
    // also immediately drain it; the property under test is that exactly one
    // worker performed the promotion, not which terminal status followed.
    expect(resolved.status).not.toBe('SCHEDULED');
    const started = await prisma.campaignEvent.count({
      where: { campaignId: campaign.id, kind: 'STARTED' },
    });
    expect(started).toBe(1);
  });

  it('completes a drained campaign exactly once when two workers race it', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'SENT',
        providerMessageId: `wamid-${randomUUID()}`,
        sentAt: new Date(),
      },
    });
    const workerA = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(new FakeSender()),
    );
    const workerB = new CampaignDispatcherService(
      prisma as never,
      config,
      asSender(new FakeSender()),
    );

    await Promise.all([workerA.tick(), workerB.tick()]);

    const resolved = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    expect(resolved.status).toBe('COMPLETED');
    const completed = await prisma.campaignEvent.count({
      where: { campaignId: campaign.id, kind: 'COMPLETED' },
    });
    expect(completed).toBe(1);
  });

  it('releases an unstarted claim on pause and skips it on cancel, but never touches a started send', async () => {
    const campaign = await createCampaign();
    const rows = await createPendingRecipients(campaign.id, 2);
    await prisma.campaignRecipient.update({
      where: { id: rows[0].id },
      data: {
        status: 'SENDING',
        claimToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() + 60_000),
        requestStartedAt: null,
      },
    });
    await prisma.campaignRecipient.update({
      where: { id: rows[1].id },
      data: {
        status: 'SENDING',
        claimToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() + 60_000),
        requestStartedAt: new Date(),
      },
    });

    const campaigns = new CampaignService(
      repo,
      policy,
      templates,
      contactsStub,
      asSender(new FakeSender()),
      credentials,
    );
    const cancelled = await campaigns.cancel(caller(), campaign.id);
    expect(cancelled.status).toBe('cancelled');

    const unstarted = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: rows[0].id },
    });
    const started = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: rows[1].id },
    });
    expect(unstarted.status).toBe('SKIPPED');
    expect(unstarted.errorCode).toBe('cancelled');
    expect(started.status).toBe('SENDING'); // untouched — may still resolve honestly
    const campaignAfter = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    });
    expect(campaignAfter.skippedCount).toBe(1);
  });

  it('returns an unstarted claim to PENDING on pause, not SKIPPED', async () => {
    const campaign = await createCampaign();
    const [recipient] = await createPendingRecipients(campaign.id, 1);
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'SENDING',
        claimToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() + 60_000),
        requestStartedAt: null,
      },
    });
    const campaigns = new CampaignService(
      repo,
      policy,
      templates,
      contactsStub,
      asSender(new FakeSender()),
      credentials,
    );

    const paused = await campaigns.pause(caller(), campaign.id);
    expect(paused.status).toBe('paused');

    const resolved = await prisma.campaignRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
    });
    expect(resolved.status).toBe('PENDING');
    expect(resolved.claimToken).toBeNull();
  });

  it('freezes one deduplicated recipient snapshot and creates one STARTED event when two launches race', async () => {
    const groupName = `مجموعة توزيع ${randomUUID().slice(0, 6)}`;
    const group = await prisma.contactGroup.create({
      data: {
        organizationId,
        name: groupName,
        normalizedName: normalizeName(groupName),
      },
    });
    ownedGroupIds.push(group.id);
    const contactPhones = [1, 2, 3].map(
      (n) => `+2011${n}${randomUUID().slice(0, 7)}`,
    );
    const contacts = await Promise.all(
      contactPhones.map((phone, index) =>
        prisma.contact.create({
          data: {
            organizationId,
            name: `جهة ${index}`,
            normalizedName: normalizeName(`جهة ${index}`),
            phone,
            normalizedPhone: normalizePhone(phone),
            source: 'MANUAL',
            ownerAccountId: actorId,
            ownerName: 'مسؤول التوزيع',
            lastActivityAt: new Date(),
            createdBy: actorId,
            updatedBy: actorId,
          },
        }),
      ),
    );
    ownedContactIds.push(...contacts.map((c) => c.id));
    await prisma.contactGroupMember.createMany({
      data: contacts.map((c) => ({
        contactId: c.id,
        groupId: group.id,
        addedBy: actorId,
      })),
    });

    const campaign = await prisma.campaign.create({
      data: {
        organizationId,
        name: `حملة إطلاق متزامن ${randomUUID()}`,
        normalizedName: normalizeName(`حملة إطلاق متزامن ${randomUUID()}`),
        templateId,
        status: 'DRAFT',
        createdById: actorId,
        createdByName: 'مسؤول التوزيع',
        audiences: { createMany: { data: [{ groupId: group.id }] } },
      },
    });
    ownedCampaignIds.push(campaign.id);

    const campaigns = new CampaignService(
      repo,
      policy,
      templates,
      contactsStub,
      asSender(new FakeSender()),
      credentials,
    );

    const attempts = await Promise.allSettled([
      campaigns.launch(caller(), campaign.id, {}),
      campaigns.launch(caller(), campaign.id, {}),
    ]);
    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
    const rejected = attempts.find(
      (a): a is PromiseRejectedResult => a.status === 'rejected',
    );
    expect(rejected?.reason).toMatchObject({ code: 'campaign-not-launchable' });

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
    });
    expect(recipients).toHaveLength(3);
    const started = await prisma.campaignEvent.count({
      where: { campaignId: campaign.id, kind: 'STARTED' },
    });
    expect(started).toBe(1);
  });
});
