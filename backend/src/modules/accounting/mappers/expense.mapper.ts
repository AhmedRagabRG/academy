import { Injectable } from '@nestjs/common';
import {
  ExpenseRequest,
  ExpenseAttachment,
  ExpenseApprovalHistory,
} from '../../../../prisma/generated/client';
import {
  ExpenseResponseDto,
  ExpenseListDto,
  AttachmentDto,
  ApprovalHistoryDto,
} from '../dtos/expense.response.dto';
import { ExpensePermissions, ExpenseStatus } from '../types/expense.types';
import { toWireStatus } from '../dtos/expense-query.dto';
import type { CallerContext } from '../../../shared/types/caller-context';

@Injectable()
export class ExpenseMapper {
  toListDto(
    expense: ExpenseRequest,
    permissions: ExpensePermissions,
    attachmentCount?: number,
  ): ExpenseListDto {
    return {
      ...(attachmentCount === undefined ? {} : { attachmentCount }),
      id: expense.id,
      expenseNumber: expense.expenseNumber,
      branchId: expense.branchId,
      categoryId: expense.categoryId,
      subcategoryId: expense.subcategoryId,
      requestedById: expense.requestedById,
      expenseDate: expense.expenseDate,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      status: toWireStatus(expense.status),
      isArchived: expense.isArchived,
      version: expense.version,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      permissions,
    };
  }

  toResponseDto(
    expense: ExpenseRequest,
    permissions: ExpensePermissions,
    attachments?: ExpenseAttachment[],
    approvalHistory?: ExpenseApprovalHistory[],
    attachmentDtos?: AttachmentDto[],
  ): ExpenseResponseDto {
    return {
      id: expense.id,
      expenseNumber: expense.expenseNumber,
      branchId: expense.branchId,
      categoryId: expense.categoryId,
      subcategoryId: expense.subcategoryId,
      requestedById: expense.requestedById,
      expenseDate: expense.expenseDate,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      precision: expense.precision,
      status: toWireStatus(expense.status),
      isArchived: expense.isArchived,
      version: expense.version,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      attachments:
        attachmentDtos ?? attachments?.map((a) => this.attachmentToDto(a)),
      approvalHistory: approvalHistory?.map((h) => this.historyToDto(h)),
      permissions,
    };
  }

  /**
   * The actor name is stored on the row, not joined: an attachment must keep
   * the name of whoever uploaded it even after that account is renamed.
   */
  private attachmentToDto(attachment: ExpenseAttachment): AttachmentDto {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      uploadedAt: attachment.uploadedAt,
      uploadedBy: {
        id: attachment.uploadedById,
        name: attachment.uploadedByName,
      },
    };
  }

  private historyToDto(history: ExpenseApprovalHistory): ApprovalHistoryDto {
    return {
      id: history.id,
      action: history.action,
      previousStatus: history.previousStatus
        ? toWireStatus(history.previousStatus)
        : undefined,
      newStatus: toWireStatus(history.newStatus),
      performedBy: {
        id: history.performedById,
        name: history.performedByName,
      },
      performedAt: history.performedAt,
      comment: history.comment || undefined,
    };
  }

  /**
   * Authorization here is permission-based, never role-name-based: role codes
   * are configurable data (`Role.code`) while permission keys are the fixed
   * contract the guards already enforce. These flags mirror the endpoint
   * guards so the UI hides exactly what the API would reject.
   */
  calculatePermissions(
    expense: ExpenseRequest,
    caller: CallerContext,
  ): ExpensePermissions {
    const isOwner = expense.requestedById === caller.accountId;
    const inBranchScope =
      caller.organizationWide ||
      caller.authorizedBranchIds.includes(expense.branchId);

    const can = (key: string) => caller.permissionKeys.includes(key);

    const isEditable = [ExpenseStatus.DRAFT, ExpenseStatus.RETURNED].includes(
      expense.status as ExpenseStatus,
    );
    const isDecidable = [
      ExpenseStatus.SUBMITTED,
      ExpenseStatus.UNDER_REVIEW,
    ].includes(expense.status as ExpenseStatus);
    const isArchivable = [
      ExpenseStatus.APPROVED,
      ExpenseStatus.REJECTED,
      ExpenseStatus.PAID,
    ].includes(expense.status as ExpenseStatus);
    // Claimable only while unclaimed, and payable only once approved: the two
    // are separate authorities, so neither implies the other.
    const isReviewable = expense.status === ExpenseStatus.SUBMITTED;
    const isPayable = expense.status === ExpenseStatus.APPROVED;

    return {
      canEdit:
        inBranchScope &&
        isEditable &&
        isOwner &&
        can('accounting.requests.update'),
      canSubmit:
        inBranchScope &&
        isEditable &&
        isOwner &&
        can('accounting.requests.submit'),
      canReview:
        inBranchScope && isReviewable && can('accounting.requests.review'),
      canApprove:
        inBranchScope && isDecidable && can('accounting.requests.decide'),
      canReject:
        inBranchScope && isDecidable && can('accounting.requests.decide'),
      canReturn:
        inBranchScope && isDecidable && can('accounting.requests.decide'),
      canMarkPaid:
        inBranchScope && isPayable && can('accounting.requests.markPaid'),
      canArchive:
        inBranchScope && isArchivable && can('accounting.requests.cancel'),
      // Discussion, not a workflow step: it stays open for as long as the
      // request is visible rather than closing when the request settles.
      canComment: inBranchScope && can('accounting.comments.add'),
    };
  }
}
