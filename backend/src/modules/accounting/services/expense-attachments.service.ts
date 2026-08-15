import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BranchScopeService } from '../../../core/authorization/branch-scope.service';
import {
  ExpenseAttachmentNotFoundException,
  ExpenseInvalidStatusException,
  ExpenseNotFoundException,
  ExpenseValidationException,
} from '../../../core/exceptions/accounting.exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFile,
} from '../../../storage/storage.service.interface';
import { AttachmentsRepository } from '../repositories/attachments.repository';
import { ExpensesRepository } from '../repositories/expenses.repository';
import { ExpensesPolicy } from '../policies/expenses.policy';
import { EDITABLE_STATUSES } from '../types/approval-workflow.types';
import { ExpenseStatus } from '../types/expense.types';
import type { AttachmentDto } from '../dtos/expense.response.dto';

@Injectable()
export class ExpenseAttachmentsService {
  private readonly maxBytes: number;

  constructor(
    private readonly attachments: AttachmentsRepository,
    private readonly expenses: ExpensesRepository,
    private readonly policy: ExpensesPolicy,
    private readonly branchScope: BranchScopeService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.maxBytes = config.getOrThrow<number>('upload.maxBytes');
  }

  /**
   * Persists the bytes through the storage service and records the returned
   * descriptor id.
   *
   * `uploadAttemptId` is passed to storage as its idempotency key, so a client
   * retrying a timed-out upload gets the same stored file rather than a
   * duplicate — the network is allowed to be unreliable, the ledger is not.
   */
  async upload(
    caller: CallerContext,
    expenseId: string,
    file: UploadedFile,
    uploadAttemptId: string,
  ): Promise<AttachmentDto> {
    if (!uploadAttemptId?.trim()) {
      throw new ExpenseValidationException([
        { field: 'uploadAttemptId', message: 'required' },
      ]);
    }

    const expense = await this.loadInScope(caller, expenseId);

    // Evidence may only be attached while the request is still the
    // requester's to change.
    if (!EDITABLE_STATUSES.includes(expense.status as ExpenseStatus)) {
      throw new ExpenseInvalidStatusException(
        expense.status,
        'upload-attachment',
      );
    }

    const existing =
      await this.attachments.findByUploadAttempt(uploadAttemptId);
    if (existing) return this.toDto(existing);

    // Validated before storing so the caller gets the documented
    // FILE_TOO_LARGE / UNSUPPORTED_FILE_TYPE codes rather than the storage
    // layer's generic ones.
    const mimeType = this.policy.assertFileAcceptable(file, this.maxBytes);

    const stored = await this.storage.store(
      file,
      'expense-attachment',
      uploadAttemptId,
    );

    const created = await this.attachments.create({
      expenseRequest: { connect: { id: expenseId } },
      fileName: file.originalname,
      fileReference: stored.id,
      mimeType,
      fileSize: file.size,
      uploadAttemptId,
      uploadedById: caller.accountId,
      uploadedByName: caller.displayName,
    });

    return this.toDto(created);
  }

  async list(
    caller: CallerContext,
    expenseId: string,
  ): Promise<AttachmentDto[]> {
    await this.loadInScope(caller, expenseId);
    const rows = await this.attachments.findByExpenseId(expenseId);
    return rows.map((row) => this.toDto(row));
  }

  /**
   * Removes the record and the stored bytes. The row goes first: an orphaned
   * blob is recoverable waste, whereas a row pointing at a deleted file is a
   * broken download for the auditor who needs it.
   */
  async remove(
    caller: CallerContext,
    expenseId: string,
    attachmentId: string,
  ): Promise<void> {
    const expense = await this.loadInScope(caller, expenseId);

    if (!EDITABLE_STATUSES.includes(expense.status as ExpenseStatus)) {
      throw new ExpenseInvalidStatusException(
        expense.status,
        'delete-attachment',
      );
    }

    const attachment = await this.attachments.findById(attachmentId);
    if (!attachment || attachment.expenseRequestId !== expenseId) {
      throw new ExpenseAttachmentNotFoundException();
    }

    await this.attachments.delete(attachmentId);
    await this.storage.remove(attachment.fileReference).catch(() => undefined);
  }

  private async loadInScope(caller: CallerContext, expenseId: string) {
    const expense = await this.expenses.findById(expenseId);
    if (!expense) throw new ExpenseNotFoundException();
    this.branchScope.assertInScope(caller, expense.branchId);
    return expense;
  }

  private toDto(row: {
    id: string;
    fileName: string;
    fileReference: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: Date;
    uploadedById: string;
    uploadedByName: string;
  }): AttachmentDto {
    return {
      id: row.id,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      uploadedAt: row.uploadedAt,
      uploadedBy: { id: row.uploadedById, name: row.uploadedByName },
      previewUrl: this.storage.publicUrl(row.fileReference, row.mimeType),
    };
  }
}
