import { DynamicModule, Module } from '@nestjs/common';
import { aiConfig, redisConfig } from '../../config/configuration';
import { QueueModule } from '../../queue/queue.module';
import { StorageModule } from '../../storage/storage.module';
import { ContactsModule } from '../contacts/contacts.module';
import { TicketsModule } from '../tickets/tickets.module';
import { InboxModule } from '../inbox/inbox.module';
import { AiAgentController } from './agent/ai-agent.controller';
import { AiAgentRepository } from './agent/ai-agent.repository';
import { AiAgentService } from './agent/ai-agent.service';
import { AiRoutingRuleController } from './agent/ai-routing-rule.controller';
import { AiRoutingRuleService } from './agent/ai-routing-rule.service';
import { KnowledgeController } from './knowledge/knowledge.controller';
import { KbIngestProcessor } from './knowledge/ingestion/kb-ingest.processor';
import { KnowledgeRepository } from './knowledge/knowledge.repository';
import { KnowledgeService } from './knowledge/knowledge.service';
import { OpenAiClient } from './llm/openai.client';
import { AiResumeSweeper } from './runtime/ai-resume.sweeper';
import { AiCallerContextService } from './runtime/ai-caller-context.service';
import { AiContextService } from './runtime/ai-context.service';
import { AiEligibilityService } from './runtime/ai-eligibility.service';
import { AiOrchestratorService } from './runtime/ai-orchestrator.service';
import { AiTurnEnqueueService } from './runtime/ai-turn-enqueue.service';
import { AiTurnListener } from './runtime/ai-turn.listener';
import { AiTurnProcessor } from './runtime/ai-turn.processor';
import { CrmAddNoteTool } from './tools/crm-add-note.tool';
import { CrmReadContactTool } from './tools/crm-read-contact.tool';
import { CrmUpdateContactTool } from './tools/crm-update-contact.tool';
import { CreateTicketTool } from './tools/create-ticket.tool';
import { HandoffToHumanTool } from './tools/handoff-to-human.tool';
import { KbSearchTool } from './tools/kb-search.tool';
import { RecordCollectedFieldsTool } from './tools/record-collected-fields.tool';
import { TicketRoutingService } from './tools/ticket-routing.service';
import { ToolBudgetService } from './tools/tool-budget.service';

@Module({})
export class AiModule {
  static register(
    options = {
      queueEnabled: aiConfig().queueEnabled,
      redisUrl: redisConfig().url,
    },
  ): DynamicModule {
    // Only the ingestion worker needs a queue. Settings and knowledge-base
    // management stay available with the queue off, so an admin can prepare
    // content before the AI is ever switched on.
    const queueAvailable =
      options.queueEnabled && options.redisUrl.trim().length > 0;
    return {
      module: AiModule,
      imports: [
        InboxModule,
        StorageModule,
        ContactsModule,
        TicketsModule,
        QueueModule.register(options),
      ],
      controllers: [
        KnowledgeController,
        AiAgentController,
        AiRoutingRuleController,
      ],
      providers: [
        OpenAiClient,
        AiResumeSweeper,
        KnowledgeRepository,
        KnowledgeService,
        AiAgentRepository,
        AiAgentService,
        AiRoutingRuleService,
        AiEligibilityService,
        AiContextService,
        AiOrchestratorService,
        AiCallerContextService,
        ToolBudgetService,
        TicketRoutingService,
        KbSearchTool,
        CrmReadContactTool,
        CrmUpdateContactTool,
        CrmAddNoteTool,
        RecordCollectedFieldsTool,
        CreateTicketTool,
        HandoffToHumanTool,
        // The worker and the producer both need a live queue. Without one the
        // rest of the module still loads, so settings and knowledge management
        // stay usable before the AI is switched on.
        ...(queueAvailable
          ? [AiTurnProcessor, AiTurnEnqueueService, AiTurnListener]
          : []),
        ...(queueAvailable ? [KbIngestProcessor] : []),
      ],
      exports: [OpenAiClient, KnowledgeService, KnowledgeRepository],
    };
  }
}
