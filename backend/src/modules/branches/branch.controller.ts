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
import { CurrentCaller } from '../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../shared/types/caller-context';
import { BranchService } from './branch.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { SetAccountBranchesDto } from './dto/set-account-branches.dto';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
  constructor(private readonly branches: BranchService) {}

  @Get()
  @RequirePermissions('settings.branches.view')
  list() {
    return this.branches.list();
  }

  @Post()
  @RequirePermissions('settings.branches.create')
  create(@CurrentCaller() caller: CallerContext, @Body() dto: CreateBranchDto) {
    return this.branches.create(caller, dto);
  }

  @Patch(':id')
  @RequirePermissions('settings.branches.update')
  update(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(caller, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('settings.branches.update')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.branches.remove(id);
  }

  @Get('accounts')
  @RequirePermissions('settings.branches.view')
  accounts() {
    return this.branches.accounts();
  }

  /** Which branches an employee is confined to. Empty means unrestricted. */
  @Put('accounts/:accountId')
  @RequirePermissions('settings.branches.update')
  setAccountBranches(
    @Param('accountId') accountId: string,
    @Body() dto: SetAccountBranchesDto,
  ) {
    return this.branches.setAccountBranches(accountId, dto.branchIds);
  }
}
