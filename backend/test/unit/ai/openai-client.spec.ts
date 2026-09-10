import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIUserAbortError,
} from 'openai';
import {
  OpenAiClient,
  OpenAiNotConfiguredError,
} from '../../../src/modules/ai/llm/openai.client';

type SdkCall = (
  body: Record<string, unknown>,
  options: { signal: AbortSignal },
) => Promise<unknown>;

jest.mock('openai', () => {
  // Keep the real error classes: the client identifies connection failures by
  // `instanceof`, so a fully synthetic mock would let a broken retry rule pass.
  const actual = jest.requireActual<Record<string, unknown>>('openai');
  const chatCreate = jest.fn();
  const embeddingCreate = jest.fn();
  const constructor = jest.fn(() => ({
    chat: { completions: { create: chatCreate } },
    embeddings: { create: embeddingCreate },
  }));
  return {
    ...actual,
    __esModule: true,
    default: constructor,
    chatCreate,
    embeddingCreate,
  };
});

const openAiMock = jest.requireMock<{
  default: jest.Mock;
  chatCreate: jest.Mock<ReturnType<SdkCall>, Parameters<SdkCall>>;
  embeddingCreate: jest.Mock<ReturnType<SdkCall>, Parameters<SdkCall>>;
}>('openai');
const mockOpenAiConstructor = openAiMock.default;
const mockChatCreate = openAiMock.chatCreate;
const mockEmbeddingCreate = openAiMock.embeddingCreate;
const response = (content = 'done') => ({
  choices: [{ message: { content, tool_calls: [] } }],
  usage: { prompt_tokens: 4, completion_tokens: 2 },
});
const config = (
  overrides: Partial<{
    apiKey: string;
    requestTimeoutMs: number;
    maxRetries: number;
  }> = {},
) =>
  new ConfigService({
    openai: {
      apiKey: 'test-key',
      chatModel: 'test-chat',
      embeddingModel: 'test-embedding',
      embeddingDimensions: 1536,
      requestTimeoutMs: 1000,
      maxRetries: 2,
      ...overrides,
    },
  });
const transient = (status: number): Error & { status: number } =>
  Object.assign(new Error(`HTTP ${status}`), { status });

describe('OpenAiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.useRealTimers());
  it('stays unconfigured without an API key and throws a typed error', async () => {
    const client = new OpenAiClient(config({ apiKey: '' }));
    expect(client.isConfigured()).toBe(false);
    await expect(
      client.chat({ system: 'system', messages: [] }),
    ).rejects.toBeInstanceOf(OpenAiNotConfiguredError);
    expect(mockOpenAiConstructor).not.toHaveBeenCalled();
  });
  it.each([429, 500])('retries HTTP %s and then succeeds', async (status) => {
    jest.useFakeTimers();
    mockChatCreate
      .mockRejectedValueOnce(transient(status))
      .mockResolvedValueOnce(response());
    const promise = new OpenAiClient(config()).chat({
      system: 'system',
      messages: [],
    });
    await jest.advanceTimersByTimeAsync(250);
    await expect(promise).resolves.toMatchObject({ content: 'done' });
    expect(mockChatCreate).toHaveBeenCalledTimes(2);
  });
  it('does not retry HTTP 400', async () => {
    mockChatCreate.mockRejectedValue(transient(400));
    await expect(
      new OpenAiClient(config()).chat({ system: 'system', messages: [] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockChatCreate).toHaveBeenCalledTimes(1);
  });
  it('gives up after maxRetries and surfaces the final error', async () => {
    jest.useFakeTimers();
    const first = transient(500);
    const second = transient(502);
    const final = transient(503);
    mockChatCreate
      .mockRejectedValueOnce(first)
      .mockRejectedValueOnce(second)
      .mockRejectedValueOnce(final);
    const promise = new OpenAiClient(config()).chat({
      system: 'system',
      messages: [],
    });
    const rejection = expect(promise).rejects.toBe(final);
    await jest.advanceTimersByTimeAsync(750);
    await rejection;
    expect(mockChatCreate).toHaveBeenCalledTimes(3);
  });
  it('aborts a request that exceeds requestTimeoutMs', async () => {
    mockChatCreate.mockImplementation(
      (_body, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            'abort',
            () => {
              const reason: unknown = options.signal.reason;
              if (reason instanceof Error) return reject(reason);
              const timeout = new Error('timeout');
              timeout.name = 'TimeoutError';
              reject(timeout);
            },
            { once: true },
          );
        }),
    );
    await expect(
      new OpenAiClient(config({ requestTimeoutMs: 5, maxRetries: 0 })).chat({
        system: 'system',
        messages: [],
      }),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(mockChatCreate).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['APIConnectionError', () => new APIConnectionError({})],
    ['APIConnectionTimeoutError', () => new APIConnectionTimeoutError({})],
  ])('retries a real SDK %s', async (_label, make) => {
    jest.useFakeTimers();
    mockChatCreate
      .mockRejectedValueOnce(make())
      .mockResolvedValueOnce(response());
    const promise = new OpenAiClient(config()).chat({
      system: 'system',
      messages: [],
    });
    await jest.advanceTimersByTimeAsync(250);
    await expect(promise).resolves.toMatchObject({ content: 'done' });
    expect(mockChatCreate).toHaveBeenCalledTimes(2);
  });
  it('does not retry its own deadline (APIUserAbortError)', async () => {
    const abort = new APIUserAbortError();
    mockChatCreate.mockRejectedValue(abort);
    await expect(
      new OpenAiClient(config()).chat({ system: 'system', messages: [] }),
    ).rejects.toBe(abort);
    expect(mockChatCreate).toHaveBeenCalledTimes(1);
  });
  it('batches embeddings at 96 and preserves input order', async () => {
    const texts = Array.from({ length: 100 }, (_, index) => `text-${index}`);
    mockEmbeddingCreate.mockImplementation((body) => {
      const batch = body.input as string[];
      return Promise.resolve({
        data: batch
          .map((text, index) => ({ index, embedding: [Number(text.slice(5))] }))
          .reverse(),
      });
    });
    await expect(new OpenAiClient(config()).embed({ texts })).resolves.toEqual(
      Array.from({ length: 100 }, (_, index) => [index]),
    );
    expect(mockEmbeddingCreate).toHaveBeenCalledTimes(2);
    expect(mockEmbeddingCreate.mock.calls[0][0]).toMatchObject({
      dimensions: 1536,
      input: texts.slice(0, 96),
    });
    expect(mockEmbeddingCreate.mock.calls[1][0]).toMatchObject({
      input: texts.slice(96),
    });
  });
});
