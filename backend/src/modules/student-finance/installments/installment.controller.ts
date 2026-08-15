import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ApiFinanceCreate,
  ApiFinanceRead,
} from '../../../shared/swagger/finance-api.decorator';
import {
  GenerateInstallmentPlanDto,
  ListInstallmentsDto,
} from './dto/generate-installment-plan.dto';
import { InstallmentRowDto } from './dto/installment-response.dto';
import { InstallmentService } from './installment.service';

/** Transport only; allocation and eligibility live in the policies. */
@ApiTags('Student Finance — Installments')
@Controller('finance')
export class InstallmentController {
  constructor(private readonly service: InstallmentService) {}

  @Post('invoices/:invoiceId/installment-plan')
  @RequirePermissions('finance.installments.manage')
  @ApiFinanceCreate(
    'Generate an installment plan whose parts sum to the invoice exactly',
    InstallmentRowDto,
  )
  generatePlan(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: GenerateInstallmentPlanDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.generatePlan(caller, invoiceId, dto);
  }

  @Get('invoices/:invoiceId/installment-policy')
  @RequirePermissions('finance.invoices.view')
  policy(
    @Param('invoiceId') invoiceId: string,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.readPolicy(caller, invoiceId);
  }

  @Get('installments')
  @RequirePermissions('finance.invoices.view')
  @ApiFinanceRead('قائمة الأقساط', InstallmentRowDto)
  list(
    @Query() query: ListInstallmentsDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.list(caller, query);
  }
}
