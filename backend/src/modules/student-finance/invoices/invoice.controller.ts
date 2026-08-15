import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ApiFinanceCreate,
  ApiFinanceMutation,
  ApiFinanceRead,
} from '../../../shared/swagger/finance-api.decorator';
import {
  InvoiceDetailDto,
  InvoiceSummaryDto,
} from './dto/invoice-response.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { RaiseInvoicesDto } from './dto/raise-invoices.dto';
import {
  CancelInvoiceDto,
  ExpectedVersionDto,
  UpdateDraftInvoiceDto,
} from './dto/update-draft-invoice.dto';
import { InvoiceExportService } from './invoice-export.service';
import { InvoiceService } from './invoice.service';

/**
 * Transport only. Binds the request, declares the permission, and calls one
 * service entry point — every rule lives in the service and its policies
 * (constitution Principle IV).
 *
 * There is deliberately no DELETE route: cancellation is the only reversal.
 */
@ApiTags('Student Finance — Invoices')
@Controller('finance/invoices')
export class InvoiceController {
  constructor(
    private readonly service: InvoiceService,
    private readonly exports: InvoiceExportService,
  ) {}

  @Post()
  @RequirePermissions('finance.invoices.create')
  @ApiFinanceCreate(
    'Raise invoices from an enrollment, one per charge purpose',
    InvoiceSummaryDto,
  )
  raise(@Body() dto: RaiseInvoicesDto, @CurrentCaller() caller: CallerContext) {
    return this.service.raise(dto, caller);
  }

  @Get()
  @RequirePermissions('finance.invoices.view')
  @ApiFinanceRead('قائمة الفواتير', InvoiceSummaryDto)
  list(@Query() query: ListInvoicesDto, @CurrentCaller() caller: CallerContext) {
    return this.service.list(caller, query);
  }

  /**
   * Declared before `:invoiceId` on purpose — a parameter route would
   * otherwise match "export" and try to load an invoice with that id.
   */
  @Get('export')
  @RequirePermissions('finance.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="invoices.csv"')
  export(
    @Query() query: ListInvoicesDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.exports.toCsv(caller, query);
  }

  @Get(':invoiceId')
  @RequirePermissions('finance.invoices.view')
  @ApiFinanceRead(
    'Full invoice detail including the derived balance',
    InvoiceDetailDto,
  )
  detail(
    @Param('invoiceId') invoiceId: string,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.detail(invoiceId, caller);
  }

  @Patch(':invoiceId')
  @RequirePermissions('finance.invoices.update')
  @ApiFinanceMutation(
    'Update a draft invoice; refused once issued',
    InvoiceDetailDto,
  )
  updateDraft(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdateDraftInvoiceDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.updateDraft(invoiceId, dto, caller);
  }

  @Post(':invoiceId/issue')
  @RequirePermissions('finance.invoices.issue')
  @ApiFinanceMutation(
    'Issue an invoice, freezing its figures permanently',
    InvoiceDetailDto,
  )
  issue(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: ExpectedVersionDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.issue(invoiceId, dto, caller);
  }

  @Post(':invoiceId/cancel')
  @RequirePermissions('finance.invoices.cancel')
  @ApiFinanceMutation(
    'Cancel an invoice; refused once money is collected',
    InvoiceDetailDto,
  )
  cancel(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CancelInvoiceDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.cancel(invoiceId, dto, caller);
  }
}
