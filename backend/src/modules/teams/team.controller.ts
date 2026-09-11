import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { TeamService } from './team.service';

@ApiTags('Teams')
@Controller('teams')
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get()
  @RequirePermissions('settings.teams.view')
  list() {
    return this.teams.list();
  }

  @Post()
  @RequirePermissions('settings.teams.create')
  create(@Body() dto: CreateTeamDto) {
    return this.teams.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('settings.teams.update')
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teams.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('settings.teams.update')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.teams.remove(id);
  }

  @Put(':id/members/:employeeId')
  @RequirePermissions('settings.teams.update')
  addMember(@Param('id') id: string, @Param('employeeId') employeeId: string) {
    return this.teams.addMember(id, employeeId);
  }

  @Delete(':id/members/:employeeId')
  @RequirePermissions('settings.teams.update')
  removeMember(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.teams.removeMember(id, employeeId);
  }
}
