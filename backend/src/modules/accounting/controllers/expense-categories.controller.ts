import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  CreateLookupValueDto,
  LookupValueListDto,
  LookupValueResponseDto,
  LookupValueStatusDto,
  UpdateLookupValueDto,
} from '../../organization/lookups/dto/lookup-value.dto';
import { LookupService } from '../../organization/lookups/lookup.service';
import {
  EXPENSE_CATEGORY_GROUP,
  EXPENSE_SUBCATEGORY_GROUP,
} from '../types/expense.types';

/**
 * Expense categories under Accounting's own permissions.
 *
 * The values live in the shared lookup store and always have — but reaching
 * them meant `/settings/lookups/{group}`, which is guarded by
 * `settings.lookups.*`. An accountant holding `accounting.categories.manage`
 * and nothing else could therefore not manage the categories their own module
 * defines, while anyone who *could* reach them could edit every other lookup
 * group in the organization too.
 *
 * These routes delegate to the same service, pinned to the two expense groups,
 * so there is one implementation and one source of truth — only the door the
 * caller comes through is different.
 */
@ApiTags('Accounting — Categories')
@ApiBearerAuth()
@Controller('expenses')
export class ExpenseCategoriesController {
  constructor(private readonly lookups: LookupService) {}

  @Get('categories')
  @RequirePermissions('accounting.categories.view')
  @ApiOperation({ summary: 'Expense categories' })
  @ApiResponse({ status: 200, type: [LookupValueResponseDto] })
  listCategories(
    @CurrentCaller() caller: CallerContext,
    @Query() query: LookupValueListDto,
  ) {
    return this.lookups.listValues(caller, EXPENSE_CATEGORY_GROUP, query);
  }

  @Post('categories')
  @RequirePermissions('accounting.categories.manage')
  @ApiOperation({ summary: 'Create an expense category' })
  @ApiResponse({ status: 201, type: LookupValueResponseDto })
  createCategory(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: CreateLookupValueDto,
  ) {
    return this.lookups.createValue(caller, EXPENSE_CATEGORY_GROUP, dto);
  }

  @Patch('categories/:id')
  @RequirePermissions('accounting.categories.manage')
  @ApiOperation({ summary: 'Rename or re-describe an expense category' })
  @ApiResponse({ status: 200, type: LookupValueResponseDto })
  updateCategory(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateLookupValueDto,
  ) {
    return this.lookups.updateValue(caller, EXPENSE_CATEGORY_GROUP, id, dto);
  }

  @Patch('categories/:id/status')
  @RequirePermissions('accounting.categories.manage')
  @ApiOperation({
    summary: 'Archive or reactivate a category; requests keep referencing it',
  })
  @ApiResponse({ status: 200, type: LookupValueResponseDto })
  setCategoryStatus(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: LookupValueStatusDto,
  ) {
    return this.lookups.statusValue(caller, EXPENSE_CATEGORY_GROUP, id, dto);
  }

  @Get('subcategories')
  @RequirePermissions('accounting.categories.view')
  @ApiOperation({ summary: 'Expense sub-categories, each under one parent' })
  @ApiResponse({ status: 200, type: [LookupValueResponseDto] })
  listSubCategories(
    @CurrentCaller() caller: CallerContext,
    @Query() query: LookupValueListDto,
  ) {
    return this.lookups.listValues(caller, EXPENSE_SUBCATEGORY_GROUP, query);
  }

  @Post('subcategories')
  @RequirePermissions('accounting.categories.manage')
  @ApiOperation({ summary: 'Create a sub-category under a category' })
  @ApiResponse({ status: 201, type: LookupValueResponseDto })
  createSubCategory(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: CreateLookupValueDto,
  ) {
    return this.lookups.createValue(caller, EXPENSE_SUBCATEGORY_GROUP, dto);
  }

  @Patch('subcategories/:id')
  @RequirePermissions('accounting.categories.manage')
  @ApiOperation({ summary: 'Rename or re-describe a sub-category' })
  @ApiResponse({ status: 200, type: LookupValueResponseDto })
  updateSubCategory(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateLookupValueDto,
  ) {
    return this.lookups.updateValue(caller, EXPENSE_SUBCATEGORY_GROUP, id, dto);
  }

  @Patch('subcategories/:id/status')
  @RequirePermissions('accounting.categories.manage')
  @ApiOperation({ summary: 'Archive or reactivate a sub-category' })
  @ApiResponse({ status: 200, type: LookupValueResponseDto })
  setSubCategoryStatus(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: LookupValueStatusDto,
  ) {
    return this.lookups.statusValue(caller, EXPENSE_SUBCATEGORY_GROUP, id, dto);
  }
}
