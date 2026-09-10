import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { AiRoutingRuleService } from './ai-routing-rule.service';
import {
  CreateAiRoutingRuleDto,
  UpdateAiRoutingRuleDto,
} from './dto/ai-routing-rule.dto';

@ApiTags('AI - Ticket routing')
@Controller('ai/agents/:agentId/routing-rules')
export class AiRoutingRuleController {
  constructor(private readonly rules: AiRoutingRuleService) {}

  @Get()
  @RequirePermissions('ai.settings.view')
  list(@Param('agentId') agentId: string) {
    return this.rules.list(agentId);
  }

  @Post()
  @RequirePermissions('ai.settings.manage')
  create(
    @Param('agentId') agentId: string,
    @Body() dto: CreateAiRoutingRuleDto,
  ) {
    return this.rules.create(agentId, dto);
  }

  @Patch(':ruleId')
  @RequirePermissions('ai.settings.manage')
  update(
    @Param('agentId') agentId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateAiRoutingRuleDto,
  ) {
    return this.rules.update(agentId, ruleId, dto);
  }

  @Delete(':ruleId')
  @RequirePermissions('ai.settings.manage')
  remove(@Param('agentId') agentId: string, @Param('ruleId') ruleId: string) {
    return this.rules.remove(agentId, ruleId);
  }
}
