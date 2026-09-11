import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { TagService } from './tag.service';

@ApiTags('Inbox Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tags: TagService) {}

  @Get()
  @RequirePermissions('settings.tags.view')
  list() {
    return this.tags.list();
  }

  @Post()
  @RequirePermissions('settings.tags.create')
  create(@Body() dto: CreateTagDto) {
    return this.tags.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('settings.tags.update')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tags.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('settings.tags.update')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.tags.remove(id);
  }
}
