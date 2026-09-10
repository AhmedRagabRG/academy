import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { UploadedFile as StoredFile } from '../../../storage/storage.service.interface';
import { KNOWLEDGE_SOURCE_MAX_BYTES } from '../../../storage/upload.constraints';
import {
  CreateKnowledgeBaseDto,
  CreateKnowledgeSourceDto,
  KnowledgeBaseVersionDto,
  UpdateKnowledgeBaseDto,
} from './dto/knowledge.dto';
import { KnowledgeService } from './knowledge.service';

@ApiTags('AI - Knowledge Bases')
@Controller('ai/knowledge-bases')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  @RequirePermissions('ai.knowledge.view')
  list() {
    return this.knowledge.list();
  }

  @Post()
  @RequirePermissions('ai.knowledge.manage')
  create(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: CreateKnowledgeBaseDto,
  ) {
    return this.knowledge.create(caller, dto);
  }

  @Patch(':id')
  @RequirePermissions('ai.knowledge.manage')
  update(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeBaseDto,
  ) {
    return this.knowledge.update(caller, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('ai.knowledge.manage')
  @HttpCode(204)
  remove(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: KnowledgeBaseVersionDto,
  ) {
    return this.knowledge.remove(caller, id, dto.expectedVersion);
  }

  @Get(':id/sources')
  @RequirePermissions('ai.knowledge.view')
  sources(@Param('id') id: string) {
    return this.knowledge.sources(id);
  }

  @Post(':id/sources')
  @RequirePermissions('ai.knowledge.manage')
  @ApiConsumes('application/json', 'multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: KNOWLEDGE_SOURCE_MAX_BYTES },
    }),
  )
  createSource(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: CreateKnowledgeSourceDto,
    @UploadedFile() file?: StoredFile,
  ) {
    return this.knowledge.createSource(caller, id, dto, file);
  }

  @Delete('sources/:sourceId')
  @RequirePermissions('ai.knowledge.manage')
  @HttpCode(204)
  deleteSource(
    @CurrentCaller() caller: CallerContext,
    @Param('sourceId') sourceId: string,
  ) {
    return this.knowledge.deleteSource(caller, sourceId);
  }

  @Post('sources/:sourceId/reindex')
  @RequirePermissions('ai.knowledge.manage')
  reindex(
    @CurrentCaller() caller: CallerContext,
    @Param('sourceId') sourceId: string,
  ) {
    return this.knowledge.reindex(caller, sourceId);
  }
}
