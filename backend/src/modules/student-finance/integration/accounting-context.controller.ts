import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { ApiFinanceRead } from '../../../shared/swagger/finance-api.decorator';
import { AccountingContextDto } from './dto/accounting-context.dto';
import { FinanceAccountingService } from './finance-accounting.service';

/**
 * Read-only projection for Accounting. Finance never depends on Accounting,
 * and Accounting never writes here — the dependency runs one way only.
 */
@ApiTags('Student Finance — Accounting Context')
@Controller('finance/accounting-context')
export class AccountingContextController {
  constructor(private readonly service: FinanceAccountingService) {}

  @Get()
  @RequirePermissions('finance.view')
  @ApiFinanceRead('حقائق مالية مستقرة للمحاسبة', AccountingContextDto)
  context() {
    return this.service.getAccountingContext();
  }
}
