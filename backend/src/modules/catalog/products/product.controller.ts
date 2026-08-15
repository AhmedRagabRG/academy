import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ApiOrganizationCreate,
  ApiOrganizationList,
  ApiOrganizationMutation,
  ApiOrganizationRead,
} from '../../../shared/swagger/organization-api.decorator';
import {
  CreateProductDto,
  ProductIdDto,
  ProductListDto,
  ProductResponseDto,
  ProductStatusDto,
  UpdateProductDto,
} from './dto/product.dto';
import { ProductService } from './product.service';
@ApiTags('Academic Catalog - Products')
@Controller('catalog/products')
export class ProductController {
  constructor(private readonly products: ProductService) {}
  @Get()
  @RequirePermissions('catalog.products.view')
  @ApiOperation({ summary: 'قائمة المنتجات الأكاديمية' })
  @ApiOrganizationList('قائمة المنتجات الأكاديمية', ProductResponseDto)
  list(@CurrentCaller() c: CallerContext, @Query() q: ProductListDto) {
    return this.products.list(c, q);
  }
  @Get(':id')
  @RequirePermissions('catalog.products.view')
  @ApiOperation({ summary: 'تفاصيل المنتج' })
  @ApiOrganizationRead('تفاصيل المنتج', ProductResponseDto)
  get(@CurrentCaller() c: CallerContext, @Param() p: ProductIdDto) {
    return this.products.get(p.id, c);
  }
  @Post()
  @RequirePermissions('catalog.products.create')
  @ApiOperation({ summary: 'إنشاء منتج مسودة' })
  @ApiOrganizationCreate('إنشاء منتج مسودة', ProductResponseDto)
  create(
    @CurrentCaller() c: CallerContext,
    @Body() d: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.products.create(c, d);
  }
  @Patch(':id')
  @RequirePermissions(
    'catalog.products.update',
    'catalog.academic.manage',
    'catalog.pricing.manage',
    'catalog.availability.manage',
    'catalog.content.manage',
    'catalog.media.manage',
  )
  @ApiOperation({ summary: 'تعديل المنتج كاملاً' })
  @ApiOrganizationMutation('تعديل المنتج كاملاً', ProductResponseDto)
  update(
    @CurrentCaller() c: CallerContext,
    @Param() p: ProductIdDto,
    @Body() d: UpdateProductDto,
  ) {
    return this.products.update(c, p.id, d);
  }
  @Patch(':id/status')
  @RequirePermissions('catalog.products.view')
  @ApiOrganizationMutation('تغيير حالة المنتج', ProductResponseDto)
  status(
    @CurrentCaller() c: CallerContext,
    @Param() p: ProductIdDto,
    @Body() d: ProductStatusDto,
  ) {
    return this.products.status(c, p.id, d);
  }
  @Get(':id/readiness')
  @RequirePermissions('catalog.products.view')
  @ApiOrganizationRead('جاهزية المنتج', ProductResponseDto)
  readiness(@CurrentCaller() c: CallerContext, @Param() p: ProductIdDto) {
    return this.products.readiness(p.id, c);
  }
  @Get(':id/eligibility')
  @RequirePermissions('catalog.products.view')
  @ApiOrganizationRead('أهلية المنتج للفرع', ProductResponseDto)
  eligibility(
    @CurrentCaller() c: CallerContext,
    @Param() p: ProductIdDto,
    @Query('branchId') branchId: string,
  ) {
    return this.products.eligibility(p.id, branchId, c);
  }
  @Get(':id/lifecycle')
  @RequirePermissions('catalog.products.view')
  @ApiOrganizationRead('سجل دورة حياة المنتج', ProductResponseDto)
  async lifecycle(@CurrentCaller() c: CallerContext, @Param() p: ProductIdDto) {
    const product = await this.products.get(p.id, c);
    return product.lifecycle;
  }
}
