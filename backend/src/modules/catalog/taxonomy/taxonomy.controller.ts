import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ProductIdDto } from '../products/dto/product.dto';
import {
  ProductTypeStatusDto,
  UpdateProductTypeDto,
} from './dto/product-type.dto';
import { TaxonomyService } from './taxonomy.service';
@ApiTags('Academic Catalog - Product Types')
@Controller('catalog/product-types')
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}
  @Get()
  @RequirePermissions('catalog.types.view')
  @ApiOkResponse({ description: 'Fixed product types' })
  list() {
    return this.taxonomy.list();
  }
  @Get(':id')
  @RequirePermissions('catalog.types.view')
  @ApiOkResponse({ description: 'Product type details' })
  get(@Param() p: ProductIdDto) {
    return this.taxonomy.get(p.id);
  }
  @Patch(':id')
  @RequirePermissions('catalog.types.update')
  @ApiOkResponse({ description: 'Updated product type' })
  update(
    @CurrentCaller() c: CallerContext,
    @Param() p: ProductIdDto,
    @Body() d: UpdateProductTypeDto,
  ) {
    return this.taxonomy.update(c, p.id, d);
  }
  @Patch(':id/status')
  @RequirePermissions('catalog.types.view')
  @ApiOkResponse({ description: 'Updated product type status' })
  status(
    @CurrentCaller() c: CallerContext,
    @Param() p: ProductIdDto,
    @Body() d: ProductTypeStatusDto,
  ) {
    return this.taxonomy.status(c, p.id, d);
  }
}
