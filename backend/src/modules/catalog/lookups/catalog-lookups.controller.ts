import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CatalogLookupsService } from './catalog-lookups.service';
@ApiTags('Academic Catalog - Lookups')
@Controller('catalog')
export class CatalogLookupsController {
  constructor(private readonly lookups: CatalogLookupsService) {}
  @Get('instructors')
  @RequirePermissions('catalog.academic.manage')
  @ApiOkResponse({ description: 'Eligible instructor options' })
  instructors(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.lookups.instructors(
      search,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }
  @Get('lookups')
  @RequirePermissions('catalog.products.view')
  @ApiOkResponse({ description: 'Bounded catalog editor lookups' })
  all() {
    return this.lookups.all();
  }
}
