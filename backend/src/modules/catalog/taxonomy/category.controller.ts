import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { LookupService } from '../../organization/lookups/lookup.service';
import {
  CreateLookupValueDto,
  LookupValueListDto,
  LookupValueStatusDto,
  UpdateLookupValueDto,
} from '../../organization/lookups/dto/lookup-value.dto';
import { ProductIdDto } from '../products/dto/product.dto';
import { ProductRepository } from '../products/product.repository';
import { EntityInUseException } from '../../../core/exceptions/organization.exceptions';
import { ForbiddenException } from '../../../core/exceptions';
const GROUP = 'business-categories';
@ApiTags('Academic Catalog - Business Categories')
@Controller('catalog/categories')
export class CategoryController {
  constructor(
    private readonly lookups: LookupService,
    private readonly products: ProductRepository,
  ) {}
  @Get()
  @RequirePermissions('catalog.categories.view')
  @ApiOkResponse({ description: 'Business categories' })
  list(@CurrentCaller() c: CallerContext, @Query() q: LookupValueListDto) {
    return this.lookups.listValues(c, GROUP, q);
  }
  @Get(':id')
  @RequirePermissions('catalog.categories.view')
  @ApiOkResponse({ description: 'Business category details' })
  get(@CurrentCaller() c: CallerContext, @Param() p: ProductIdDto) {
    return this.lookups.value(c, GROUP, p.id);
  }
  @Post()
  @RequirePermissions('catalog.categories.create')
  @ApiOkResponse({ description: 'Created business category' })
  create(@CurrentCaller() c: CallerContext, @Body() d: CreateLookupValueDto) {
    return this.lookups.createValue(c, GROUP, d);
  }
  @Patch(':id')
  @RequirePermissions('catalog.categories.update')
  @ApiOkResponse({ description: 'Updated business category' })
  update(
    @CurrentCaller() c: CallerContext,
    @Param() p: ProductIdDto,
    @Body() d: UpdateLookupValueDto,
  ) {
    return this.lookups.updateValue(c, GROUP, p.id, d);
  }
  @Patch(':id/status')
  @RequirePermissions('catalog.categories.view')
  @ApiOkResponse({ description: 'Updated business category status' })
  async status(
    @CurrentCaller() c: CallerContext,
    @Param() p: ProductIdDto,
    @Body() d: LookupValueStatusDto,
  ) {
    const required =
      d.status === 'ARCHIVED'
        ? 'catalog.categories.archive'
        : 'catalog.categories.activate';
    if (!c.permissionKeys.includes(required)) throw new ForbiddenException();
    if (
      d.status !== 'ACTIVE' &&
      (await this.products.countByCategory(p.id)) > 0
    )
      throw new EntityInUseException(
        'Business category is assigned to an active product',
      );
    return this.lookups.statusValue(c, GROUP, p.id, d);
  }
}
