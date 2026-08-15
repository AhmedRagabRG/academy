import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ApiFinanceRead } from '../../../shared/swagger/finance-api.decorator';
import { ListInvoicesDto } from '../invoices/dto/list-invoices.dto';
import { DashboardSummaryDto } from './dto/dashboard-response.dto';
import { FinanceDashboardService } from './finance-dashboard.service';

@ApiTags('Student Finance — Dashboard')
@Controller('finance/dashboard')
export class FinanceDashboardController {
  constructor(private readonly service: FinanceDashboardService) {}

  @Get('summary')
  @RequirePermissions('finance.view')
  @ApiFinanceRead('ملخص لوحة المؤشرات المالية', DashboardSummaryDto)
  summary(
    @Query() query: ListInvoicesDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.summary(caller, query);
  }
}
