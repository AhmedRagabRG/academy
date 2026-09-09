import type { PrismaService } from '../../../src/database/prisma.service';
import type { ChannelCredentialsService } from '../../../src/modules/inbox/channels/channel-credentials.service';
import type { MetaGraphClient } from '../../../src/modules/inbox/channels/meta-graph.client';
import { CampaignPolicy } from '../../../src/modules/campaigns/campaign.policy';
import { WhatsappTemplateService } from '../../../src/modules/campaigns/templates/whatsapp-template.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller = (permissionKeys: string[] = ['campaigns.templates.sync']) =>
  ({
    accountId: 'account-1',
    displayName: 'مسؤول الحملات',
    email: 'ops@test.invalid',
    sessionId: 'session-1',
    roles: [],
    permissionKeys,
    authorizedBranchIds: [],
    organizationWide: true,
    authenticatedAt: new Date(0).toISOString(),
  }) as CallerContext;

const database = (overrides: Record<string, unknown> = {}) => {
  const upserted: unknown[] = [];
  const updated: unknown[] = [];
  const transactionOptions: Array<
    { maxWait: number; timeout: number } | undefined
  > = [];
  const db = {
    organization: {
      findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'org-1' }),
    },
    whatsappTemplate: {
      upsert: jest.fn((args: { create: unknown; update: unknown }) => {
        upserted.push(args.create);
        updated.push(args.update);
        return Promise.resolve({ id: `row-${upserted.length}` });
      }),
      updateMany: jest.fn(
        (args: { data: { status: string; syncedAt: Date } }) => {
          void args;
          return Promise.resolve({ count: 0 });
        },
      ),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
  db.$transaction = jest.fn(
    (
      callback: (tx: unknown) => Promise<unknown>,
      options?: { maxWait: number; timeout: number },
    ) => {
      transactionOptions.push(options);
      return callback(db);
    },
  );
  return {
    db: db as unknown as PrismaService,
    upserted,
    updated,
    transactionOptions,
    raw: db,
  };
};

const graphClient = (assets: unknown[]) =>
  ({
    messageTemplates: jest.fn().mockResolvedValue(assets),
  }) as unknown as MetaGraphClient;

const credentialsFor = (resolved: Record<string, unknown> | null) =>
  ({
    forPlatform: jest.fn().mockResolvedValue(resolved),
  }) as unknown as ChannelCredentialsService;

describe('WhatsappTemplateService.sync', () => {
  it('upserts each language variant of a template under its own provider id', async () => {
    const { db, upserted, transactionOptions } = database();
    const service = new WhatsappTemplateService(
      db,
      graphClient([
        {
          id: 'tpl-ar',
          name: 'open_day_invite',
          language: 'ar',
          status: 'APPROVED',
          category: 'MARKETING',
          components: [
            { type: 'HEADER', format: 'TEXT', text: 'دعوة {{1}}' },
            { type: 'BODY', text: 'مرحبًا {{1}}، {{2}}' },
            { type: 'FOOTER', text: 'أكاديمية السلام' },
          ],
        },
        {
          id: 'tpl-en',
          name: 'open_day_invite',
          language: 'en_US',
          status: 'PENDING',
          category: 'MARKETING',
          components: [{ type: 'BODY', text: 'Hello {{1}}' }],
        },
      ]),
      credentialsFor({
        providerAccountId: 'phone-id',
        accessToken: 'wa-token',
        businessAccountId: 'waba-1',
      }),
      new CampaignPolicy(),
    );

    const result = await service.sync(caller());
    expect(result.synced).toBe(2);
    expect(transactionOptions[0]).toEqual({
      maxWait: 10_000,
      timeout: 60_000,
    });
    expect(upserted).toHaveLength(2);
    expect(upserted[0]).toMatchObject({
      providerTemplateId: 'tpl-ar',
      language: 'ar',
      status: 'APPROVED',
      headerKind: 'TEXT',
      headerText: 'دعوة {{1}}',
      bodyText: 'مرحبًا {{1}}، {{2}}',
      footerText: 'أكاديمية السلام',
      variableCount: 2,
      headerVariableCount: 1,
      // Send credentials are environment-only; a synced row must never keep
      // (or acquire) a link to a legacy inbox connection row.
      connectionId: null,
    });
    expect(upserted[1]).toMatchObject({
      providerTemplateId: 'tpl-en',
      language: 'en_US',
      status: 'PENDING',
      variableCount: 1,
    });
  });

  it('nulls connectionId on both the create and update branch of the upsert', async () => {
    const { db, upserted, updated } = database();
    const service = new WhatsappTemplateService(
      db,
      graphClient([
        {
          id: 'tpl-1',
          name: 'reminder',
          language: 'ar',
          status: 'APPROVED',
          category: 'UTILITY',
          components: [{ type: 'BODY', text: 'مرحبًا' }],
        },
      ]),
      credentialsFor({
        providerAccountId: 'phone-id',
        accessToken: 'wa-token',
        businessAccountId: 'waba-1',
      }),
      new CampaignPolicy(),
    );

    await service.sync(caller());
    expect(upserted[0]).toMatchObject({ connectionId: null });
    expect(updated[0]).toMatchObject({ connectionId: null });
  });

  it('retires templates no longer present in the upstream fetch', async () => {
    const { db, raw } = database();
    raw.whatsappTemplate.updateMany.mockResolvedValue({
      count: 1,
    });
    const service = new WhatsappTemplateService(
      db,
      graphClient([]),
      credentialsFor({
        providerAccountId: 'phone-id',
        accessToken: 'wa-token',
        businessAccountId: 'waba-1',
      }),
      new CampaignPolicy(),
    );

    const result = await service.sync(caller());
    expect(result.retired).toBe(1);
    const retirement = raw.whatsappTemplate.updateMany.mock.calls[0]?.[0];
    expect(retirement?.data.status).toBe('DISABLED');
    expect(retirement?.data.syncedAt).toBeInstanceOf(Date);
  });

  it('refuses to sync when no WhatsApp channel is configured on the server', async () => {
    const { db } = database();
    const service = new WhatsappTemplateService(
      db,
      graphClient([]),
      credentialsFor(null),
      new CampaignPolicy(),
    );
    await expect(service.sync(caller())).rejects.toMatchObject({
      code: 'channel-not-configured',
      status: 503,
    });
  });

  it('refuses to sync when the configured channel carries no business account id', async () => {
    const { db } = database();
    const service = new WhatsappTemplateService(
      db,
      graphClient([]),
      credentialsFor({
        providerAccountId: 'phone-id',
        accessToken: 'wa-token',
      }),
      new CampaignPolicy(),
    );
    await expect(service.sync(caller())).rejects.toMatchObject({
      code: 'waba-unknown',
      status: 422,
    });
  });

  it('rejects a caller without sync permission', async () => {
    const { db } = database();
    const service = new WhatsappTemplateService(
      db,
      graphClient([]),
      credentialsFor(null),
      new CampaignPolicy(),
    );
    await expect(service.sync(caller([]))).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('WhatsappTemplateService.project', () => {
  it('exposes the placeholder tokens and named flag for a positional template', () => {
    const service = new WhatsappTemplateService(
      {} as PrismaService,
      {} as MetaGraphClient,
      {} as ChannelCredentialsService,
      new CampaignPolicy(),
    );
    const projected = service.project({
      id: 'tpl-1',
      organizationId: 'org-1',
      connectionId: null,
      wabaId: 'waba-1',
      providerTemplateId: 'tpl-ar',
      name: 'open_day_invite',
      language: 'ar',
      category: 'MARKETING',
      status: 'APPROVED',
      headerKind: 'TEXT',
      headerText: 'دعوة {{1}}',
      bodyText: 'مرحبًا {{1}}، {{2}}',
      footerText: 'أكاديمية السلام',
      buttons: [],
      variableCount: 2,
      headerVariableCount: 1,
      qualityScore: 'GREEN',
      rejectedReason: null,
      syncedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as never);
    expect(projected.variableTokens).toEqual(['1', '2']);
    expect(projected.headerVariableTokens).toEqual(['1']);
    expect(projected.named).toBe(false);
    expect(projected.status).toBe('approved');
  });

  it('flags a named template even when only the header uses named placeholders', () => {
    const service = new WhatsappTemplateService(
      {} as PrismaService,
      {} as MetaGraphClient,
      {} as ChannelCredentialsService,
      new CampaignPolicy(),
    );
    const projected = service.project({
      id: 'tpl-2',
      organizationId: 'org-1',
      connectionId: null,
      wabaId: 'waba-1',
      providerTemplateId: 'tpl-named',
      name: 'named_template',
      language: 'ar',
      category: 'MARKETING',
      status: 'APPROVED',
      headerKind: 'TEXT',
      headerText: 'دعوة {{first_name}}',
      bodyText: 'مرحبًا بك',
      footerText: null,
      buttons: [],
      variableCount: 0,
      headerVariableCount: 1,
      qualityScore: null,
      rejectedReason: null,
      syncedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as never);
    expect(projected.named).toBe(true);
  });
});
