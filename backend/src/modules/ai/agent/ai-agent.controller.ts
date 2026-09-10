import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { AiAgentService } from './ai-agent.service';
import { UpdateAiAgentDto } from './dto/ai-agent.dto';

@ApiTags('AI - Agents')
@Controller('ai/agents')
export class AiAgentController {
  constructor(private readonly agents: AiAgentService) {}

  @Get()
  @RequirePermissions('ai.settings.view')
  list() {
    return this.agents.list();
  }

  @Get(':id')
  @RequirePermissions('ai.settings.view')
  byId(@Param('id') id: string) {
    return this.agents.byId(id);
  }

  @Patch(':id')
  @RequirePermissions('ai.settings.manage')
  update(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateAiAgentDto,
  ) {
    return this.agents.update(caller, id, dto);
  }
}
