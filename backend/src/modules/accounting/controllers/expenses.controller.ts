import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { UploadedFile as StoredFile } from '../../../storage/storage.service.interface';
import { CreateExpenseDto } from '../dtos/create-expense.dto';
import {
  CreateExpenseCommentDto,
  ExpenseActionDto,
  ExpenseQueryDto,
} from '../dtos/expense-query.dto';
import {
  AttachmentDto,
  ExpenseCommentDto,
  ExpenseListDto,
  ExpenseResponseDto,
} from '../dtos/expense.response.dto';
import { UpdateExpenseDto } from '../dtos/update-expense.dto';
import { ExpenseMapper } from '../mappers/expense.mapper';
import { ExpenseAttachmentsService } from '../services/expense-attachments.service';
import { ExpenseCommentsService } from '../services/expense-comments.service';
import { ExpenseApprovalService } from '../services/expense-approvals.service';
import { ExpenseSearchService } from '../services/expense-search.service';
import { ExpenseService } from '../services/expenses.service';

/**
 * Transport only. Binds the request, declares the permission, and calls one
 * service entry point — every rule lives in the services and the policy
 * (constitution Principle IV).
 *
 * There is no DELETE on an expense: archival is the only removal. The single
 * DELETE route removes an attachment from a still-editable request.
 */
@ApiTags('Accounting — Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpenseController {
  constructor(
    private readonly expenses: ExpenseService,
    private readonly approvals: ExpenseApprovalService,
    private readonly search: ExpenseSearchService,
    private readonly attachments: ExpenseAttachmentsService,
    private readonly comments: ExpenseCommentsService,
    private readonly mapper: ExpenseMapper,
  ) {}

  @Post()
  @RequirePermissions('accounting.requests.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an expense request in Draft' })
  @ApiResponse({ status: 201, type: ExpenseListDto })
  @ApiResponse({
    status: 422,
    description: 'VALIDATION_ERROR / INVALID_CATEGORY',
  })
  async create(
    @Body() dto: CreateExpenseDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.expenses.createExpense(caller, dto);
    return this.mapper.toListDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
    );
  }

  @Get()
  @RequirePermissions('accounting.requests.view')
  @ApiOperation({ summary: 'List expense requests with search and filters' })
  @ApiResponse({ status: 200, type: [ExpenseListDto] })
  async list(
    @Query() query: ExpenseQueryDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const result = await this.search.listExpenses(caller, query);
    // Returned as a `PageResult`, which `ResponseEnvelopeInterceptor`
    // recognises and flattens into `{ data, meta }`. Returning `{ data, meta }`
    // directly instead left the rows nested a second level deep inside `data`,
    // so this was the one list endpoint whose envelope differed.
    return {
      items: result.data.map((expense) =>
        this.mapper.toListDto(
          expense,
          this.mapper.calculatePermissions(expense, caller),
          result.attachmentCounts.get(expense.id) ?? 0,
        ),
      ),
      total: result.meta.total,
      page: result.meta.page,
      pageSize: result.meta.limit,
      totalPages: result.meta.totalPages,
    };
  }

  @Get(':id')
  @RequirePermissions('accounting.requests.view')
  @ApiOperation({ summary: 'Expense detail with attachments and history' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ExpenseResponseDto })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async detail(
    @Param('id') id: string,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.expenses.getExpense(caller, id);
    const [attachments, history] = await Promise.all([
      this.attachments.list(caller, id),
      this.approvals.getApprovalHistory(caller, id),
    ]);

    return this.mapper.toResponseDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
      undefined,
      history,
      attachments,
    );
  }

  @Patch(':id')
  @RequirePermissions('accounting.requests.update')
  @ApiOperation({ summary: 'Update a Draft or Returned request' })
  @ApiResponse({ status: 200, type: ExpenseResponseDto })
  @ApiResponse({
    status: 409,
    description: 'INVALID_STATUS / VERSION_CONFLICT',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.expenses.updateExpense(caller, id, dto);
    return this.mapper.toListDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
    );
  }

  @Post(':id/submit')
  @RequirePermissions('accounting.requests.submit')
  @ApiOperation({
    summary: 'Submit for review; requires at least one attachment',
  })
  @ApiResponse({ status: 200, type: ExpenseListDto })
  @ApiResponse({ status: 422, description: 'At least one attachment required' })
  async submit(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.expenses.submitExpense(
      caller,
      id,
      dto.expectedVersion,
    );
    return this.mapper.toListDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
    );
  }

  @Post(':id/review')
  @RequirePermissions('accounting.requests.review')
  @ApiOperation({
    summary: 'Claim a submitted request for review before deciding it',
  })
  @ApiResponse({ status: 200, type: ExpenseListDto })
  @ApiResponse({ status: 409, description: 'INVALID_STATUS / VERSION_CONFLICT' })
  async review(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.approvals.startReview(
      caller,
      id,
      dto.expectedVersion,
    );
    return this.mapper.toListDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
    );
  }

  @Post(':id/pay')
  @RequirePermissions('accounting.requests.markPaid')
  @ApiOperation({ summary: 'Record that an approved request has been paid' })
  @ApiResponse({ status: 200, type: ExpenseListDto })
  @ApiResponse({ status: 409, description: 'INVALID_STATUS / VERSION_CONFLICT' })
  async pay(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.approvals.markPaid(
      caller,
      id,
      dto.expectedVersion,
      dto.comment,
    );
    return this.mapper.toListDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
    );
  }

  @Get(':id/comments')
  @RequirePermissions('accounting.requests.view')
  @ApiOperation({ summary: 'The discussion thread, separate from the history' })
  @ApiResponse({ status: 200, type: [ExpenseCommentDto] })
  listComments(
    @Param('id') id: string,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.comments.list(caller, id);
  }

  @Post(':id/comments')
  @RequirePermissions('accounting.comments.add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment; never part of the audit record' })
  @ApiResponse({ status: 201, type: ExpenseCommentDto })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateExpenseCommentDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.comments.add(caller, id, dto.body);
  }

  @Post(':id/approve')
  @RequirePermissions('accounting.requests.decide')
  @ApiOperation({ summary: 'Approve a submitted request' })
  @ApiResponse({ status: 200, type: ExpenseListDto })
  async approve(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.approvals.approveExpense(
      caller,
      id,
      dto.expectedVersion,
      dto.comment,
    );
    return this.mapper.toListDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
    );
  }

  @Post(':id/reject')
  @RequirePermissions('accounting.requests.decide')
  @ApiOperation({ summary: 'Reject a submitted request; reason required' })
  @ApiResponse({ status: 200, type: ExpenseListDto })
  async reject(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.approvals.rejectExpense(
      caller,
      id,
      dto.expectedVersion,
      dto.comment,
    );
    return this.mapper.toListDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
    );
  }

  @Post(':id/return')
  @RequirePermissions('accounting.requests.decide')
  @ApiOperation({ summary: 'Return for correction; reason required' })
  @ApiResponse({ status: 200, type: ExpenseListDto })
  async returnExpense(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.approvals.returnExpense(
      caller,
      id,
      dto.expectedVersion,
      dto.comment,
    );
    return this.mapper.toListDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
    );
  }

  @Post(':id/archive')
  @RequirePermissions('accounting.requests.cancel')
  @ApiOperation({ summary: 'Archive a settled request; stays queryable' })
  @ApiResponse({ status: 200, type: ExpenseListDto })
  async archive(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const expense = await this.expenses.archiveExpense(
      caller,
      id,
      dto.expectedVersion,
    );
    return this.mapper.toListDto(
      expense,
      this.mapper.calculatePermissions(expense, caller),
    );
  }

  @Post(':id/attachments')
  @RequirePermissions('accounting.attachments.manage')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Attach a PDF, JPG or PNG to a Draft/Returned request',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        uploadAttemptId: { type: 'string' },
      },
      required: ['file', 'uploadAttemptId'],
    },
  })
  @ApiResponse({ status: 201, type: AttachmentDto })
  @ApiResponse({ status: 413, description: 'FILE_TOO_LARGE' })
  @ApiResponse({ status: 422, description: 'UNSUPPORTED_FILE_TYPE' })
  @HttpCode(HttpStatus.CREATED)
  upload(
    @Param('id') id: string,
    @UploadedFile() file: StoredFile,
    @Body('uploadAttemptId') uploadAttemptId: string,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.attachments.upload(caller, id, file, uploadAttemptId);
  }

  @Delete(':id/attachments/:attachmentId')
  @RequirePermissions('accounting.attachments.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an attachment from a Draft/Returned request',
  })
  @ApiResponse({ status: 204, description: 'Removed' })
  @ApiResponse({ status: 409, description: 'INVALID_STATUS' })
  remove(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.attachments.remove(caller, id, attachmentId);
  }
}
