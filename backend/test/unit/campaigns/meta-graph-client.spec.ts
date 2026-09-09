import { ConfigService } from '@nestjs/config';
import { MetaGraphClient } from '../../../src/modules/inbox/channels/meta-graph.client';

const config = new ConfigService({ meta: { graphVersion: 'v25.0' } });

describe('MetaGraphClient.messageTemplates', () => {
  afterEach(() => jest.restoreAllMocks());

  it('follows every paging cursor and maps Meta template fields', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'tpl-ar',
                name: 'open_day_invite',
                language: 'ar',
                status: 'APPROVED',
                category: 'MARKETING',
                quality_score: { score: 'GREEN' },
                components: [
                  { type: 'HEADER', format: 'TEXT', text: 'دعوة {{1}}' },
                  { type: 'BODY', text: 'مرحبًا {{1}}' },
                  { type: 'FOOTER', text: 'أكاديمية السلام' },
                ],
              },
            ],
            paging: {
              next: 'https://graph.facebook.com/v25.0/waba-1/message_templates?after=cursor-1',
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'tpl-en',
                name: 'open_day_invite',
                language: 'en_US',
                status: 'PENDING',
                category: 'MARKETING',
                components: [{ type: 'BODY', text: 'Hello {{1}}' }],
              },
            ],
            paging: {},
          }),
          { status: 200 },
        ),
      );

    const client = new MetaGraphClient(config);
    const templates = await client.messageTemplates('waba-1', 'wa-token');

    expect(templates).toHaveLength(2);
    expect(templates[0]).toMatchObject({
      id: 'tpl-ar',
      name: 'open_day_invite',
      language: 'ar',
      qualityScore: 'GREEN',
    });
    expect(templates[1]).toMatchObject({
      id: 'tpl-en',
      language: 'en_US',
      status: 'PENDING',
    });

    // Second page uses the cursor's own path and query string, not the first page's.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallUrl = fetchMock.mock.calls[1]?.[0] as string;
    expect(secondCallUrl).toContain('/waba-1/message_templates');
    expect(secondCallUrl).toContain('after=cursor-1');
  });

  it('stops once a page carries no next cursor', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [], paging: {} }), { status: 200 }),
      );
    const client = new MetaGraphClient(config);
    await expect(
      client.messageTemplates('waba-1', 'wa-token'),
    ).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('distinguishes an expired access token from other provider failures', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Invalid OAuth access token' } }),
          { status: 401 },
        ),
      );
    const client = new MetaGraphClient(config);
    await expect(
      client.messageTemplates('waba-1', 'bad-token'),
    ).rejects.toMatchObject({ code: 'provider-auth-failed', status: 422 });
  });

  it('maps an upstream outage to a 502', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('', { status: 503 }));
    const client = new MetaGraphClient(config);
    await expect(
      client.messageTemplates('waba-1', 'wa-token'),
    ).rejects.toMatchObject({ code: 'provider-unavailable', status: 502 });
  });

  it('distinguishes Meta rate limiting and network failures as retryable', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: 4, message: 'rate limited' } }),
          { status: 400 },
        ),
      )
      .mockRejectedValueOnce(new Error('socket closed'));
    const client = new MetaGraphClient(config);
    await expect(
      client.messageTemplates('waba-1', 'wa-token'),
    ).rejects.toMatchObject({ code: 'provider-rate-limited', status: 503 });
    await expect(
      client.messageTemplates('waba-1', 'wa-token'),
    ).rejects.toMatchObject({ code: 'provider-unavailable', status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a malformed provider template without retiring the cache', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: 'tpl-without-language', name: 'broken', status: 'APPROVED' },
          ],
          paging: {},
        }),
        { status: 200 },
      ),
    );
    const client = new MetaGraphClient(config);
    await expect(
      client.messageTemplates('waba-1', 'wa-token'),
    ).rejects.toMatchObject({ code: 'provider-response-invalid', status: 502 });
  });

  it('never copies access_token, appsecret_proof, or unknown params from a paging cursor', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            paging: {
              next: 'https://graph.facebook.com/v25.0/waba-1/message_templates?after=cursor-1&access_token=leaked-token&appsecret_proof=leaked-proof&unexpected=drop-me',
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [], paging: {} }), {
          status: 200,
        }),
      );
    const client = new MetaGraphClient(config);
    await client.messageTemplates('waba-1', 'wa-token');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallUrl = fetchMock.mock.calls[1]?.[0] as string;
    expect(secondCallUrl).toContain('after=cursor-1');
    expect(secondCallUrl).toContain(
      'fields=id%2Cname%2Clanguage%2Cstatus%2Ccategory%2Ccomponents%2Cquality_score%2Crejected_reason',
    );
    expect(secondCallUrl).not.toContain('access_token');
    expect(secondCallUrl).not.toContain('appsecret_proof');
    expect(secondCallUrl).not.toContain('leaked');
    expect(secondCallUrl).not.toContain('unexpected');
  });

  it('detects a paging cursor that loops back to an already-fetched page', async () => {
    const loopingNext =
      'https://graph.facebook.com/v25.0/waba-1/message_templates?after=cursor-1';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ data: [], paging: { next: loopingNext } }),
            { status: 200 },
          ),
        ),
      );
    const client = new MetaGraphClient(config);
    await expect(
      client.messageTemplates('waba-1', 'wa-token'),
    ).rejects.toMatchObject({ code: 'provider-pagination-cycle', status: 502 });
    // The first page, then the repeated cursor once — never a third attempt.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws instead of silently truncating an account past the bounded page limit', async () => {
    let calls = 0;
    jest.spyOn(global, 'fetch').mockImplementation(() => {
      calls += 1;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [],
            paging: {
              next: `https://graph.facebook.com/v25.0/waba-1/message_templates?after=cursor-${calls}`,
            },
          }),
          { status: 200 },
        ),
      );
    });
    const client = new MetaGraphClient(config);
    await expect(
      client.messageTemplates('waba-1', 'wa-token'),
    ).rejects.toMatchObject({ code: 'provider-pagination-limit', status: 502 });
    expect(calls).toBe(20);
  });
});
