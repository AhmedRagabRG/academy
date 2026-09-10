import type { ChatTool } from '../llm/openai.client';

/** A routing category the model may pick when escalating — admin-configured. */
export interface RoutingCategory {
  category: string;
  label: string;
}

/** A data-collection field the agent may ask the customer for. */
export interface CollectionField {
  key: string;
  label: string;
}

/**
 * Everything a tool is allowed to know about the turn it runs in. Scope lives
 * here, never in the model's arguments: an id the model did not receive cannot
 * be widened into one it did. Routing categories and collection fields are
 * injected from admin configuration for the same reason.
 */
export interface AiRunContext {
  organizationId: string;
  conversationId: string;
  agentId: string;
  /** The agent's real, restricted service account — the identity tools act as. */
  serviceAccountId: string;
  aiTurnId: string;
  customerId: string;
  contactId: string | null;
  knowledgeBaseIds: string[];
  retrievalTopK: number;
  retrievalMinScore: number;
  /** CRM fields this agent may fill — already intersected with the hard ceiling. */
  allowedCrmFields: string[];
  /** Data-collection fields configured for this agent. */
  collectionFields: CollectionField[];
  /** Closed escalation categories (active routing rules) for this agent. */
  routingCategories: RoutingCategory[];
  /** Below this self-reported confidence, escalation stays unassigned. */
  routingMinConfidence: number;
}

export interface ToolResult {
  /** Serialized back to the model as the tool message. */
  content: string;
  /** Chunk ids that grounded this result, recorded on the turn for audit. */
  citedChunkIds?: string[];
  /**
   * A business effect the ORCHESTRATOR — never the model — must carry out
   * after the reply is committed: pause for a human, or because a ticket was
   * created. Pausing mid-turn would fence out the turn's own reply.
   */
  effect?: 'handoff' | 'escalated';
}

export interface AgentTool {
  readonly name: string;
  /** Built per run: the tool's schema can be shaped by admin configuration. */
  definition(context: AiRunContext): ChatTool;
  /**
   * Parse and validate the model's raw JSON arguments. Returning an error
   * string rather than throwing is deliberate: a malformed call is the model's
   * mistake to correct on the next iteration, not a job failure.
   */
  parse(
    raw: string,
  ): { ok: true; input: unknown } | { ok: false; error: string };
  execute(input: never, context: AiRunContext): Promise<ToolResult>;
}

/** Every tool the runtime can expose, in registry order. */
export const AGENT_TOOL_NAMES = [
  'kb_search',
  'crm_read_contact',
  'crm_update_contact',
  'crm_add_note',
  'record_collected_fields',
  'create_ticket',
  'handoff_to_human',
] as const;

/**
 * The fields the CRM write tool may ever touch. `phone` is NOT on this list
 * and never will be: it is the contact identity key
 * (`@@unique([organizationId, normalizedPhone])`), so rewriting it could
 * collide with or hijack another contact. The admin's `allowedCrmFields` can
 * only narrow this ceiling.
 */
export const WRITABLE_CONTACT_FIELDS = [
  'name',
  'email',
  'secondaryPhone',
  'company',
  'jobTitle',
] as const;

export const jsonSchema = (
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
