import { ConfigService } from '@nestjs/config';
import type { ChannelCredentialsService } from '../../../src/modules/inbox/channels/channel-credentials.service';
import {
  TemplateSendError,
  WhatsappTemplateSender,
} from '../../../src/modules/campaigns/dispatch/whatsapp-template.sender';

const config = new ConfigService({ meta: { graphVersion: 'v25.0' } });
const channel = {
  platformCode: 'whatsapp' as const,
  providerAccountId: 'phone-id',
  accessToken: 'wa-token',
};

const credentials = (resolved: typeof channel | null) =>
  ({
    forPlatform: jest.fn().mockResolvedValue(resolved),
  }) as unknown as ChannelCredentialsService;

describe('WhatsappTemplateSender', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends positional parameters without a parameter_name', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid-1' }] }), {
        status: 200,
      }),
    );
    const sender = new WhatsappTemplateSender(config, credentials(channel));
    const reference = await sender.send(
      {
        organizationId: 'org-1',
        to: '201000000000',
        templateName: 'open_day_invite',
        language: 'ar',
        bodyTokens: ['1', '2'],
        bodyValues: ['هدى', 'الاثنين'],
        headerTokens: [],
        headerValues: [],
      },
      channel,
    );
    expect(reference).toBe('wamid-1');
    const body: unknown = JSON.parse(
      (fetchMock.mock.calls[0]?.[1]?.body as string) ?? '{}',
    );
    expect(body).toMatchObject({
      template: {
        name: 'open_day_invite',
        language: { code: 'ar' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'هدى' },
              { type: 'text', text: 'الاثنين' },
            ],
          },
        ],
      },
    });
  });

  it('sends named parameters with parameter_name and includes the header component', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid-2' }] }), {
        status: 200,
      }),
    );
    const sender = new WhatsappTemplateSender(config, credentials(channel));
    await sender.send(
      {
        organizationId: 'org-1',
        to: '201000000000',
        templateName: 'named_template',
        language: 'ar',
        bodyTokens: ['first_name'],
        bodyValues: ['هدى'],
        headerTokens: ['title'],
        headerValues: ['دعوة خاصة'],
      },
      channel,
    );
    const body: unknown = JSON.parse(
      (fetchMock.mock.calls[0]?.[1]?.body as string) ?? '{}',
    );
    expect(body).toMatchObject({
      template: {
        components: [
          {
            type: 'header',
            parameters: [
              { type: 'text', parameter_name: 'title', text: 'دعوة خاصة' },
            ],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', parameter_name: 'first_name', text: 'هدى' },
            ],
          },
        ],
      },
    });
  });

  it('classifies a rate-limit refusal as retryable', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 130429, message: 'throughput' } }),
          { status: 400 },
        ),
      );
    const sender = new WhatsappTemplateSender(config, credentials(channel));
    await expect(
      sender.send(
        {
          organizationId: 'org-1',
          to: '201000000000',
          templateName: 'x',
          language: 'ar',
          bodyTokens: [],
          bodyValues: [],
          headerTokens: [],
          headerValues: [],
        },
        channel,
      ),
    ).rejects.toMatchObject({ code: '130429', retryable: true });
  });

  it('classifies an invalid-number refusal as final', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 131026, message: 'not on WhatsApp' },
        }),
        { status: 400 },
      ),
    );
    const sender = new WhatsappTemplateSender(config, credentials(channel));
    const failure = await sender
      .send(
        {
          organizationId: 'org-1',
          to: '201000000000',
          templateName: 'x',
          language: 'ar',
          bodyTokens: [],
          bodyValues: [],
          headerTokens: [],
          headerValues: [],
        },
        channel,
      )
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(TemplateSendError);
    expect(failure).toMatchObject({ code: '131026', retryable: false });
  });

  it('refuses to resolve a channel that has no environment configuration', async () => {
    const sender = new WhatsappTemplateSender(config, credentials(null));
    await expect(sender.channel('org-1')).rejects.toMatchObject({
      code: 'channel-not-configured',
      status: 503,
    });
  });
});
