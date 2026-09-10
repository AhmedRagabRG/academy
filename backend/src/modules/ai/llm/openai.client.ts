import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { APIConnectionError } from 'openai';
import type { OpenAiConfig } from '../../../config/config.types';

export interface ChatToolCall {
  id: string;
  name: string;
  arguments: string;
}
export type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: ChatToolCall[] }
  | { role: 'tool'; content: string; toolCallId: string };
export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
    strict?: boolean;
  };
}
export interface ChatResult {
  content: string;
  toolCalls: ChatToolCall[];
  promptTokens: number;
  completionTokens: number;
}
export class OpenAiNotConfiguredError extends Error {
  constructor() {
    super('OpenAI is not configured: OPENAI_API_KEY is empty');
    this.name = 'OpenAiNotConfiguredError';
  }
}

interface ErrorShape {
  status?: unknown;
  code?: unknown;
  name?: unknown;
}
interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}
interface EmbeddingResponse {
  data: Array<{ index: number; embedding: number[] }>;
}

const EMBEDDING_BATCH_SIZE = 96;
const BASE_RETRY_DELAY_MS = 250;
const MAX_RETRY_DELAY_MS = 4000;
const NETWORK_ERROR_CODES = new Set([
  'ABORT_ERR',
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
]);
const NETWORK_ERROR_NAMES = new Set([
  'AbortError',
  'APIConnectionError',
  'APIConnectionTimeoutError',
  'TimeoutError',
]);

const errorShape = (error: unknown): ErrorShape =>
  typeof error === 'object' && error !== null ? error : {};
/**
 * The SDK's connection failures carry no `status`, no `code`, and inherit
 * Error's default `name`, so duck-typing cannot see them — only `instanceof`
 * identifies one. `APIConnectionTimeoutError` extends `APIConnectionError`, so
 * this covers both.
 *
 * `APIUserAbortError` is deliberately excluded. It means our own
 * `requestTimeoutMs` deadline fired, which has already burned the full request
 * budget; retrying would multiply the wall time of a turn that a customer is
 * waiting on. A caller that wants another attempt should widen the timeout.
 */
const retryable = (error: unknown): boolean => {
  if (error instanceof APIConnectionError) return true;
  const shape = errorShape(error);
  if (typeof shape.status === 'number')
    return shape.status === 429 || (shape.status >= 500 && shape.status < 600);
  return (
    (typeof shape.code === 'string' && NETWORK_ERROR_CODES.has(shape.code)) ||
    (typeof shape.name === 'string' && NETWORK_ERROR_NAMES.has(shape.name))
  );
};
const errorCode = (error: unknown): string => {
  const shape = errorShape(error);
  if (typeof shape.status === 'number') return String(shape.status);
  if (typeof shape.code === 'string') return shape.code;
  // SDK errors all report name 'Error'; the constructor name is the useful label.
  if (error instanceof Error && error.constructor.name !== 'Error')
    return error.constructor.name;
  if (typeof shape.name === 'string') return shape.name;
  return 'unknown';
};
const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

@Injectable()
export class OpenAiClient {
  private readonly logger = new Logger(OpenAiClient.name);
  private readonly settings: OpenAiConfig;
  private sdkClient?: OpenAI;
  constructor(config: ConfigService) {
    this.settings = config.getOrThrow<OpenAiConfig>('openai');
  }
  isConfigured(): boolean {
    return this.settings.apiKey.trim().length > 0;
  }
  private sdk(): OpenAI {
    if (!this.isConfigured()) throw new OpenAiNotConfiguredError();
    this.sdkClient ??= new OpenAI({
      apiKey: this.settings.apiKey,
      maxRetries: 0,
    });
    return this.sdkClient;
  }
  private async request<T>(
    model: string,
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      const startedAt = performance.now();
      try {
        return await operation(
          AbortSignal.timeout(this.settings.requestTimeoutMs),
        );
      } catch (error) {
        this.logger.warn({
          model,
          latencyMs: Math.round(performance.now() - startedAt),
          errorCode: errorCode(error),
        });
        if (attempt >= this.settings.maxRetries || !retryable(error))
          throw error;
        await wait(
          Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** attempt),
        );
        attempt += 1;
      }
    }
  }
  async chat(input: {
    system: string;
    messages: ChatMessage[];
    tools?: ChatTool[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<ChatResult> {
    const startedAt = performance.now();
    const messages = input.messages.map((message) => {
      if (message.role === 'tool')
        return {
          role: 'tool' as const,
          content: message.content,
          tool_call_id: message.toolCallId,
        };
      if (message.role === 'assistant' && message.toolCalls)
        return {
          role: 'assistant' as const,
          content: message.content,
          tool_calls: message.toolCalls.map((toolCall) => ({
            id: toolCall.id,
            type: 'function' as const,
            function: {
              name: toolCall.name,
              arguments: toolCall.arguments,
            },
          })),
        };
      return message;
    });
    const response = await this.request<ChatCompletionResponse>(
      this.settings.chatModel,
      async (signal) =>
        (await this.sdk().chat.completions.create(
          {
            model: this.settings.chatModel,
            messages: [{ role: 'system', content: input.system }, ...messages],
            ...(input.tools ? { tools: input.tools } : {}),
            ...(input.maxTokens === undefined
              ? {}
              : { max_tokens: input.maxTokens }),
            ...(input.temperature === undefined
              ? {}
              : { temperature: input.temperature }),
          },
          { signal },
        )) as ChatCompletionResponse,
    );
    const message = response.choices[0]?.message;
    const result: ChatResult = {
      content: message?.content ?? '',
      toolCalls:
        message?.tool_calls
          ?.filter((toolCall) => toolCall.type === 'function')
          .map((toolCall) => ({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          })) ?? [],
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
    };
    this.logger.log({
      model: this.settings.chatModel,
      latencyMs: Math.round(performance.now() - startedAt),
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });
    return result;
  }
  async embed(input: { texts: string[] }): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (
      let offset = 0;
      offset < input.texts.length;
      offset += EMBEDDING_BATCH_SIZE
    ) {
      const batch = input.texts.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      const startedAt = performance.now();
      const response = await this.request<EmbeddingResponse>(
        this.settings.embeddingModel,
        async (signal) =>
          this.sdk().embeddings.create(
            {
              model: this.settings.embeddingModel,
              input: batch,
              dimensions: this.settings.embeddingDimensions,
              encoding_format: 'float',
            },
            { signal },
          ),
      );
      embeddings.push(
        ...response.data
          .toSorted((left, right) => left.index - right.index)
          .map((item) => item.embedding),
      );
      this.logger.log({
        model: this.settings.embeddingModel,
        latencyMs: Math.round(performance.now() - startedAt),
      });
    }
    return embeddings;
  }
}
