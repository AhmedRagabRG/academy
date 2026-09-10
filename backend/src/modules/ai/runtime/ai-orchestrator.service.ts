import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { OpenAiClient, type ChatMessage } from '../llm/openai.client';
import { CrmAddNoteTool } from '../tools/crm-add-note.tool';
import { CrmReadContactTool } from '../tools/crm-read-contact.tool';
import { CrmUpdateContactTool } from '../tools/crm-update-contact.tool';
import { CreateTicketTool } from '../tools/create-ticket.tool';
import { HandoffToHumanTool } from '../tools/handoff-to-human.tool';
import { KbSearchTool } from '../tools/kb-search.tool';
import { RecordCollectedFieldsTool } from '../tools/record-collected-fields.tool';
import type { AgentTool, AiRunContext } from '../tools/tool.contract';

export interface OrchestratorResult {
  reply: string;
  grounded: boolean;
  usedFallback: boolean;
  citedChunkIds: string[];
  promptTokens: number;
  completionTokens: number;
  toolCalls: number;
  /** The model asked to hand off — the processor pauses after sending. */
  handoffRequested: boolean;
  /** A ticket was created — the processor pauses as ESCALATED after sending. */
  escalated: boolean;
}

/** Bounded so a looping model cannot spend without limit on one turn. */
const MAX_ITERATIONS = 4;

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);
  private readonly tools: AgentTool[];

  constructor(
    private readonly openAi: OpenAiClient,
    private readonly db: PrismaService,
    kbSearch: KbSearchTool,
    crmRead: CrmReadContactTool,
    crmUpdate: CrmUpdateContactTool,
    crmAddNote: CrmAddNoteTool,
    recordCollected: RecordCollectedFieldsTool,
    createTicket: CreateTicketTool,
    handoff: HandoffToHumanTool,
  ) {
    this.tools = [
      kbSearch,
      crmRead,
      crmUpdate,
      crmAddNote,
      recordCollected,
      createTicket,
      handoff,
    ];
  }

  /**
   * One turn: call the model, run whatever tools it asks for, repeat until it
   * answers or the iteration budget runs out.
   *
   * Grounding is enforced here rather than trusted to the prompt. A reply that
   * makes factual claims without a single retrieved passage behind it is
   * replaced by the configured fallback, because a confident invented price is
   * far more damaging than an admission that we need to check.
   */
  async run(input: {
    system: string;
    history: ChatMessage[];
    context: AiRunContext;
    maxTokens: number;
    temperature: number;
    fallbackMessage: string;
    handoffMessage: string;
    maxToolCalls: number;
    /** The customer's newest message asked something; a factual reply must be grounded. */
    customerAsked?: boolean;
    /**
     * Admin allow-list for this run. An empty configuration keeps the Phase 5
     * read-only defaults, so an agent configured before write tools existed
     * stays exactly as read-only as it was.
     */
    allowedToolNames?: string[];
  }): Promise<OrchestratorResult> {
    const allowed = input.allowedToolNames?.length
      ? input.allowedToolNames
      : ['kb_search', 'crm_read_contact'];
    const available = this.tools.filter((tool) => allowed.includes(tool.name));
    const messages: ChatMessage[] = [...input.history];
    const citedChunkIds: string[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let toolCalls = 0;
    let searched = false;
    let handoffRequested = false;
    let escalated = false;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
      const result = await this.openAi.chat({
        system: input.system,
        messages,
        tools: available.map((tool) => tool.definition(input.context)),
        maxTokens: input.maxTokens,
        temperature: input.temperature,
      });
      promptTokens += result.promptTokens;
      completionTokens += result.completionTokens;

      if (!result.toolCalls.length) {
        const reply = result.content.trim();
        const grounded = citedChunkIds.length > 0;
        // "Asked a question" is a legitimate ungrounded reply; an ungrounded
        // factual assertion is not. Two situations make one likely: the model
        // searched but retrieval came back under the relevance floor, or the
        // customer asked something and the model never searched at all — the
        // second is exactly the confident-invention case, so both fall back.
        // A turn where the customer asked nothing and no search happened is
        // conversation, and replacing it would turn every "عفوًا" into the
        // fallback message.
        const asksSomething = /[?؟]\s*$/.test(reply);
        if (!reply)
          return this.fallback(
            input.fallbackMessage,
            citedChunkIds,
            promptTokens,
            completionTokens,
            toolCalls,
            handoffRequested,
            escalated,
          );
        if (!grounded && !asksSomething && (searched || input.customerAsked))
          return this.fallback(
            input.fallbackMessage,
            citedChunkIds,
            promptTokens,
            completionTokens,
            toolCalls,
            handoffRequested,
            escalated,
          );
        return {
          reply,
          grounded,
          usedFallback: false,
          citedChunkIds,
          promptTokens,
          completionTokens,
          toolCalls,
          handoffRequested,
          escalated,
        };
      }

      for (const call of result.toolCalls) {
        if (toolCalls >= input.maxToolCalls) {
          await this.record(
            input.context,
            call.name,
            call.arguments,
            'DENIED',
            'tool budget exhausted for this turn',
          );
          messages.push({
            role: 'assistant',
            content: null,
            toolCalls: [call],
          });
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            content: JSON.stringify({
              error: 'tool budget exhausted for this turn',
            }),
          });
          continue;
        }
        toolCalls += 1;
        const tool = available.find((entry) => entry.name === call.name);
        messages.push({ role: 'assistant', content: null, toolCalls: [call] });
        if (!tool) {
          await this.record(
            input.context,
            call.name,
            call.arguments,
            'DENIED',
            'unknown tool',
          );
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            content: JSON.stringify({ error: 'unknown tool' }),
          });
          continue;
        }
        const parsed = tool.parse(call.arguments);
        if (!parsed.ok) {
          // Returned to the model, not thrown: a malformed call is its mistake
          // to correct, and a job failure here would lose a valid turn.
          await this.record(
            input.context,
            tool.name,
            call.arguments,
            'VALIDATION_ERROR',
            parsed.error,
          );
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            content: JSON.stringify({ error: parsed.error }),
          });
          continue;
        }
        const startedAt = performance.now();
        try {
          const output = await tool.execute(
            parsed.input as never,
            input.context,
          );
          if (tool.name === 'kb_search') searched = true;
          if (output.citedChunkIds?.length)
            citedChunkIds.push(...output.citedChunkIds);
          if (output.effect === 'handoff') handoffRequested = true;
          if (output.effect === 'escalated') escalated = true;
          await this.record(
            input.context,
            tool.name,
            call.arguments,
            'SUCCESS',
            null,
            Math.round(performance.now() - startedAt),
          );
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            content: output.content,
          });
          if (output.effect === 'handoff') {
            // Terminal: the configured handoff message is the reply — the
            // model's own words after a handoff request are not delivered.
            return {
              reply: input.handoffMessage,
              grounded: true,
              usedFallback: false,
              citedChunkIds,
              promptTokens,
              completionTokens,
              toolCalls,
              handoffRequested,
              escalated,
            };
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn({ tool: tool.name, error: message });
          await this.record(
            input.context,
            tool.name,
            call.arguments,
            'ERROR',
            message,
          );
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            content: JSON.stringify({ error: 'tool failed' }),
          });
        }
      }
    }

    // Out of iterations without a final answer: fall back rather than send the
    // last partial thought.
    return this.fallback(
      input.fallbackMessage,
      citedChunkIds,
      promptTokens,
      completionTokens,
      toolCalls,
      handoffRequested,
      escalated,
    );
  }

  private fallback(
    message: string,
    citedChunkIds: string[],
    promptTokens: number,
    completionTokens: number,
    toolCalls: number,
    handoffRequested = false,
    escalated = false,
  ): OrchestratorResult {
    return {
      reply: message,
      grounded: false,
      usedFallback: true,
      citedChunkIds,
      promptTokens,
      completionTokens,
      toolCalls,
      handoffRequested,
      escalated,
    };
  }

  /** Every tool call is auditable, including the ones that were refused. */
  private async record(
    context: AiRunContext,
    toolName: string,
    rawInput: string,
    outcome: 'SUCCESS' | 'VALIDATION_ERROR' | 'DENIED' | 'ERROR',
    errorMessage: string | null,
    latencyMs?: number,
  ): Promise<void> {
    await this.db.aiToolExecution.create({
      data: {
        aiTurnId: context.aiTurnId,
        organizationId: context.organizationId,
        toolName,
        input: this.safeJson(rawInput),
        outcome,
        errorMessage,
        latencyMs: latencyMs ?? null,
      },
    });
  }

  private safeJson(raw: string): object {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : { raw };
    } catch {
      return { raw };
    }
  }
}
