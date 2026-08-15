import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { ExpenseController } from './controllers/expenses.controller';
import { ExpenseCategoriesController } from './controllers/expense-categories.controller';
import { ExpenseService } from './services/expenses.service';
import { ExpenseApprovalService } from './services/expense-approvals.service';
import { ExpenseSearchService } from './services/expense-search.service';
import { ExpensesRepository } from './repositories/expenses.repository';
import { AttachmentsRepository } from './repositories/attachments.repository';
import { ApprovalHistoryRepository } from './repositories/approval-history.repository';
import { CommentsRepository } from './repositories/comments.repository';
import { ExpenseMapper } from './mappers/expense.mapper';
import { ExpenseEventEmitter } from './events/expense.events';
import { ExpenseAttachmentsService } from './services/expense-attachments.service';
import { ExpenseCommentsService } from './services/expense-comments.service';
import { ExpensesPolicy } from './policies/expenses.policy';
import { StorageModule } from '../../storage/storage.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [CoreModule, StorageModule, OrganizationModule],
  providers: [
    ExpenseService,
    ExpenseApprovalService,
    ExpenseSearchService,
    ExpensesRepository,
    AttachmentsRepository,
    ApprovalHistoryRepository,
    CommentsRepository,
    ExpenseMapper,
    ExpenseEventEmitter,
    ExpenseAttachmentsService,
    ExpenseCommentsService,
    ExpensesPolicy,
  ],
  // Categories first: Nest matches in registration order, and
  // `GET /expenses/:id` would otherwise swallow `GET /expenses/categories`
  // by reading "categories" as an expense id.
  controllers: [ExpenseCategoriesController, ExpenseController],
  exports: [ExpenseService, ExpenseApprovalService, ExpenseSearchService],
})
export class AccountingModule {}
