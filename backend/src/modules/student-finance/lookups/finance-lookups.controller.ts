import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { ApiFinanceRead } from '../../../shared/swagger/finance-api.decorator';
import { FinanceLookupsDto } from './dto/lookups-response.dto';
import { FinanceLookupsService } from './finance-lookups.service';

@ApiTags('Student Finance — Lookups')
@Controller('finance/lookups')
export class FinanceLookupsController {
  constructor(private readonly service: FinanceLookupsService) {}

  @Get()
  @RequirePermissions('finance.view')
  @ApiFinanceRead('قوائم وسياسات الشؤون المالية', FinanceLookupsDto)
  all() {
    return this.service.all();
  }
}
