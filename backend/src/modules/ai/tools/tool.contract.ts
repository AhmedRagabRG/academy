import type { ChatTool } from '../llm/openai.client';

/**
 * Everything a tool is allowed to know about the turn it runs in. Scope lives
 * here, never in the model's arguments: an id the model did not receive cannot
 * be widened into one it did.
 */
export interface AiRunContext {
  organizationId: string;
  conversationId: string;
  agentId: string;
  aiTurnId: string;
  customerId: string;
  contactId: string | null;
  knowledgeBaseIds: string[];
  retrievalTopK: number;
  retrievalMinScore: number;
}

export interface ToolResult {
  /** Serialized back to the model as the tool message. */
  content: string;
  /** Chunk ids that grounded this result, recorded on the turn for audit. */
  citedChunkIds?: string[];
}

export interface AgentTool {
  readonly name: string;
  readonly definition: ChatTool;
  /**
   * Parse and validate the model's raw JSON arguments. Returning an error
   * string rather than throwing is deliberate: a malformed call is the model's
   * mistake to correct on the next iteration, not a job failure.
   */
  parse(raw: string): { ok: true; input: unknown } | { ok: false; error: string };
  execute(input: never, context: AiRunContext): Promise<ToolResult>;
}

export const jsonSchema = (
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
