import { Injectable } from '@nestjs/common';
import {
  BatchNotReadyException,
  NotFoundException,
} from '../../../core/exceptions';
import { mapImmutableRevision } from '../mappers/program-batch.mapper';
import type { ProgramBatchesPublicPort } from '../types/program-batches-public.port';
import { BatchRepository } from './batch.repository';
import { BatchService } from './batch.service';

@Injectable()
export class BatchPublicService implements ProgramBatchesPublicPort {
  constructor(
    private readonly repository: BatchRepository,
    private readonly service: BatchService,
  ) {}

  async resolveHistorical(batchId: string) {
    const row = await this.repository.find(batchId);
    return row
      ? {
          id: row.id,
          programId: row.programId,
          code: row.code,
          name: row.nameAr,
          status: row.status,
          version: row.version,
          archived: row.status === 'ARCHIVED',
        }
      : null;
  }

  async selectableForProgram(
    programId: string,
    branchId: string | undefined,
    evaluationDate: string,
    page: number,
    pageSize: number,
  ) {
    const result = await this.repository.list(programId, {
      branchId,
      status: 'REGISTRATION_OPEN',
      page,
      pageSize,
    });
    const evaluated = await Promise.all(
      result.items.map(async (row) => {
        const registrationBranch =
          branchId ??
          row.branches.find((x) => x.role === 'REGISTRATION')?.branchId;
        if (!registrationBranch) return null;
        const eligibility = await this.service.eligibility(
          row.id,
          registrationBranch,
          evaluationDate,
        );
        return eligibility.eligible
          ? {
              id: row.id,
              programId: row.programId,
              code: row.code,
              name: row.nameAr,
              status: row.status,
              version: row.version,
              archived: false,
              availableSeats: eligibility.availableSeats,
              financialRevisionId: eligibility.financialRevisionId,
            }
          : null;
      }),
    );
    const items = evaluated.filter((item) => item !== null);
    return {
      ...result,
      items,
      total: items.length,
      totalPages: Math.ceil(items.length / result.pageSize),
    };
  }

  readiness(batchId: string) {
    return this.service.readiness(batchId);
  }

  eligibility(batchId: string, branchId: string, evaluationDate: string) {
    return this.service.eligibility(batchId, branchId, evaluationDate);
  }

  async currentSelectionReference(
    batchId: string,
    branchId: string,
    evaluationDate: string,
  ) {
    const row = await this.repository.find(batchId);
    if (!row) throw new NotFoundException();
    const eligibility = await this.service.eligibility(
      batchId,
      branchId,
      evaluationDate,
    );
    if (!eligibility.eligible) throw new BatchNotReadyException();
    return {
      batchId,
      programId: row.programId,
      branchId,
      batchVersion: row.version,
      financialRevisionId: eligibility.financialRevisionId,
      availableSeats: eligibility.availableSeats,
      evaluationDate,
    };
  }

  async resolveFinancialRevision(batchId: string, financialRevisionId: string) {
    const revisions = await this.repository.revisions(batchId);
    const row = revisions.find((item) => item.id === financialRevisionId);
    return row ? mapImmutableRevision(row) : null;
  }

  async snapshotForSelection(
    batchId: string,
    branchId: string,
    evaluationDate: string,
  ) {
    const row = await this.repository.find(batchId);
    if (!row) throw new NotFoundException();
    const reference = await this.currentSelectionReference(
      batchId,
      branchId,
      evaluationDate,
    );
    const revision = await this.resolveFinancialRevision(
      batchId,
      reference.financialRevisionId,
    );
    if (!revision) throw new NotFoundException();
    const branch = row.branches.find((item) => item.branchId === branchId);
    if (!branch) throw new NotFoundException();
    return {
      ...reference,
      batch: {
        id: row.id,
        programId: row.programId,
        code: row.code,
        name: row.nameAr,
        status: row.status,
        version: row.version,
        archived: row.status === 'ARCHIVED',
      },
      branchLabel:
        (await this.service.get(batchId)).branchAssignments.find(
          (item) => item.branchId === branchId,
        )?.branch.label ?? branchId,
      schedule: {
        registrationStartDate:
          row.registrationStartDate?.toISOString().slice(0, 10) ?? null,
        registrationEndDate:
          row.registrationEndDate?.toISOString().slice(0, 10) ?? null,
        studyStartDate: row.studyStartDate?.toISOString().slice(0, 10) ?? null,
        studyEndDate: row.studyEndDate?.toISOString().slice(0, 10) ?? null,
        graduationDate: row.graduationDate?.toISOString().slice(0, 10) ?? null,
      },
      financialRevision: revision,
    };
  }
}
