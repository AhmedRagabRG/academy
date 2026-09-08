import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/generated/client';
import type { LeadOutcome } from '../../../prisma/generated/client';
import {
  DependencyInUseException,
  DomainException,
  NotFoundException,
  VersionConflictException,
} from '../../core/exceptions';
import { PrismaService } from '../../database/prisma.service';
import type { CallerContext } from '../../shared/types/caller-context';
import { LeadPolicy } from './lead.policy';
import type {
  CreatePipelineDto,
  CreatePipelineStageDto,
  PipelineStageVersionDto,
  PipelineVersionDto,
  ReorderPipelineStagesDto,
  UpdatePipelineDto,
  UpdatePipelineStageDto,
} from './dto/pipeline-admin.dto';

const aggregateInclude = { stages: true } satisfies Prisma.PipelineInclude;
type PipelineAggregate = Prisma.PipelineGetPayload<{
  include: typeof aggregateInclude;
}>;
type StageRow = PipelineAggregate['stages'][number];

const isFkViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2003';

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

const isWriteConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2034';

@Injectable()
export class PipelineAdminService {
  constructor(
    private readonly db: PrismaService,
    private readonly policy: LeadPolicy,
  ) {}

  private async organizationId(): Promise<string> {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  private async withStages(id: string): Promise<PipelineAggregate | null> {
    return this.db.pipeline.findUnique({
      where: { id },
      include: aggregateInclude,
    });
  }

  private async organizationPipeline(
    id: string,
    organizationId: string,
  ): Promise<PipelineAggregate> {
    const pipeline = await this.withStages(id);
    if (!pipeline || pipeline.organizationId !== organizationId)
      throw new NotFoundException();
    return pipeline;
  }

  private async advancePipelineVersion(
    tx: Prisma.TransactionClient,
    pipelineId: string,
    expectedVersion: number,
  ): Promise<void> {
    const updated = await tx.pipeline.updateMany({
      where: { id: pipelineId, version: expectedVersion },
      data: { version: { increment: 1 }, updatedAt: new Date() },
    });
    if (updated.count === 1) return;
    const latest = await tx.pipeline.findUnique({
      where: { id: pipelineId },
      select: { version: true },
    });
    throw new VersionConflictException(latest?.version ?? expectedVersion);
  }

  private projectStage(stage: StageRow, leadCounts: Map<string, number>) {
    return {
      id: stage.id,
      code: stage.code,
      name: stage.name,
      description: stage.description,
      probability: stage.probability,
      accent: stage.accent,
      outcome: stage.outcome.toLowerCase(),
      position: stage.position,
      isEntry: stage.isEntry,
      active: stage.active,
      version: stage.version,
      leadCount: leadCounts.get(stage.id) ?? 0,
    };
  }

  private projectWithCounts(
    pipeline: PipelineAggregate,
    counts: Map<string, number>,
  ) {
    const stages = [...pipeline.stages].sort((a, b) => a.position - b.position);
    return {
      id: pipeline.id,
      code: pipeline.code,
      name: pipeline.name,
      isDefault: pipeline.isDefault,
      active: pipeline.active,
      version: pipeline.version,
      createdAt: pipeline.createdAt.toISOString(),
      updatedAt: pipeline.updatedAt.toISOString(),
      leadCount: stages.reduce(
        (total, stage) => total + (counts.get(stage.id) ?? 0),
        0,
      ),
      stages: stages.map((stage) => this.projectStage(stage, counts)),
    };
  }

  private async leadCounts(pipelineIds: string[]) {
    if (!pipelineIds.length) return new Map<string, number>();
    const rows = await this.db.lead.groupBy({
      by: ['stageId'],
      where: { pipelineId: { in: pipelineIds } },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.stageId, row._count._all]));
  }

  private async project(pipeline: PipelineAggregate) {
    return this.projectWithCounts(
      pipeline,
      await this.leadCounts([pipeline.id]),
    );
  }

  private async projected(id: string) {
    const pipeline = await this.withStages(id);
    if (!pipeline) throw new NotFoundException();
    return this.project(pipeline);
  }

  async list(c: CallerContext) {
    this.policy.assert(c, 'pipeline.view');
    const organizationId = await this.organizationId();
    const pipelines = await this.db.pipeline.findMany({
      where: { organizationId },
      include: aggregateInclude,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    const counts = await this.leadCounts(
      pipelines.map((pipeline) => pipeline.id),
    );
    return pipelines.map((pipeline) =>
      this.projectWithCounts(pipeline, counts),
    );
  }

  async detail(c: CallerContext, id: string) {
    this.policy.assert(c, 'pipeline.view');
    const organizationId = await this.organizationId();
    const pipeline = await this.organizationPipeline(id, organizationId);
    return this.project(pipeline);
  }

  async create(c: CallerContext, dto: CreatePipelineDto) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const code = dto.code.toLowerCase();
    const existing = await this.db.pipeline.findFirst({
      where: { organizationId, code },
    });
    if (existing)
      throw new DomainException(
        'pipeline-code-taken',
        'رمز المسار مستخدم بالفعل',
        409,
      );
    const hasDefault = await this.db.pipeline.findFirst({
      where: { organizationId, isDefault: true },
      select: { id: true },
    });
    try {
      const created = await this.db.pipeline.create({
        data: {
          organizationId,
          code,
          name: dto.name,
          isDefault: !hasDefault,
        },
        include: aggregateInclude,
      });
      return this.project(created);
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DomainException(
          'pipeline-create-conflict',
          'أنشأ مستخدم آخر مسارًا بنفس الرمز أو غيّر المسار الافتراضي. حدّث الصفحة ثم أعد المحاولة',
          409,
        );
      throw error;
    }
  }

  async update(c: CallerContext, id: string, dto: UpdatePipelineDto) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const current = await this.organizationPipeline(id, organizationId);
    if (dto.isDefault === false && current.isDefault)
      throw new DomainException(
        'pipeline-default-required',
        'يجب أن يظل مسار واحد افتراضيًا. اجعل مسارًا آخر افتراضيًا بدلاً من ذلك',
        409,
      );
    if (dto.isDefault === true) {
      if (!current.active)
        throw new DomainException(
          'pipeline-archived',
          'لا يمكن جعل مسار مؤرشف افتراضيًا',
          409,
        );
      if (!current.stages.some((stage) => stage.active))
        throw new DomainException(
          'pipeline-stage-required',
          'أضف مرحلة نشطة واحدة على الأقل قبل جعل هذا المسار افتراضيًا',
          409,
        );
    }
    try {
      await this.db.$transaction(async (tx) => {
        if (dto.isDefault === true)
          await tx.pipeline.updateMany({
            where: { organizationId, isDefault: true, id: { not: id } },
            data: {
              isDefault: false,
              version: { increment: 1 },
              updatedAt: new Date(),
            },
          });
        const result = await tx.pipeline.updateMany({
          where: { id, version: dto.expectedVersion },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.isDefault !== undefined
              ? { isDefault: dto.isDefault }
              : {}),
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        if (result.count !== 1) {
          const latest = await tx.pipeline.findUnique({
            where: { id },
            select: { version: true },
          });
          throw new VersionConflictException(
            latest?.version ?? dto.expectedVersion,
          );
        }
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DomainException(
          'pipeline-default-conflict',
          'تم تغيير المسار الافتراضي بواسطة مستخدم آخر. حدّث الصفحة ثم أعد المحاولة',
          409,
        );
      throw error;
    }
    return this.projected(id);
  }

  async archive(c: CallerContext, id: string, dto: PipelineVersionDto) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const current = await this.organizationPipeline(id, organizationId);
    if (!current.active)
      throw new DomainException(
        'invalid-transition',
        'المسار مؤرشف بالفعل',
        409,
      );
    if (current.isDefault)
      throw new DomainException(
        'pipeline-default-archive',
        'لا يمكن أرشفة المسار الافتراضي. اجعل مسارًا آخر افتراضيًا أولاً',
        409,
      );
    const result = await this.db.pipeline.updateMany({
      where: { id, version: dto.expectedVersion },
      data: {
        active: false,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      const latest = await this.db.pipeline.findUnique({
        where: { id },
        select: { version: true },
      });
      throw new VersionConflictException(latest?.version ?? current.version);
    }
    return this.projected(id);
  }

  async restore(c: CallerContext, id: string, dto: PipelineVersionDto) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const current = await this.organizationPipeline(id, organizationId);
    if (current.active)
      throw new DomainException('invalid-transition', 'المسار نشط بالفعل', 409);
    const result = await this.db.pipeline.updateMany({
      where: { id, version: dto.expectedVersion },
      data: {
        active: true,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      const latest = await this.db.pipeline.findUnique({
        where: { id },
        select: { version: true },
      });
      throw new VersionConflictException(latest?.version ?? current.version);
    }
    return this.projected(id);
  }

  async remove(c: CallerContext, id: string, expectedVersion: number) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    try {
      await this.db.$transaction(
        async (tx) => {
          const current = await tx.pipeline.findFirst({
            where: { id, organizationId },
            select: { version: true, isDefault: true },
          });
          if (!current) throw new NotFoundException();
          if (current.version !== expectedVersion)
            throw new VersionConflictException(current.version);
          const leadCount = await tx.lead.count({
            where: { pipelineId: id },
          });
          if (leadCount > 0) throw new DependencyInUseException();
          if (current.isDefault)
            throw new DomainException(
              'pipeline-default-delete',
              'لا يمكن حذف المسار الافتراضي. اجعل مسارًا آخر افتراضيًا أولاً',
              409,
            );
          const totalPipelines = await tx.pipeline.count({
            where: { organizationId },
          });
          if (totalPipelines <= 1)
            throw new DomainException(
              'pipeline-required',
              'يجب أن تحتوي المؤسسة على مسار واحد على الأقل',
              409,
            );
          const deleted = await tx.pipeline.deleteMany({
            where: { id, organizationId, version: expectedVersion },
          });
          if (deleted.count !== 1)
            throw new VersionConflictException(expectedVersion);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isFkViolation(error)) throw new DependencyInUseException();
      if (isWriteConflict(error))
        throw new DomainException(
          'pipeline-delete-conflict',
          'تغيرت المسارات أثناء الحذف. حدّث الصفحة ثم أعد المحاولة',
          409,
        );
      throw error;
    }
  }

  async createStage(
    c: CallerContext,
    pipelineId: string,
    dto: CreatePipelineStageDto,
  ) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const pipeline = await this.organizationPipeline(
      pipelineId,
      organizationId,
    );
    const code = dto.code.toLowerCase();
    if (pipeline.stages.some((stage) => stage.code === code))
      throw new DomainException(
        'stage-code-taken',
        'رمز المرحلة مستخدم بالفعل في هذا المسار',
        409,
      );
    const isFirstStage = pipeline.stages.length === 0;
    const isEntry = isFirstStage ? true : Boolean(dto.isEntry);
    const position = pipeline.stages.length
      ? Math.max(...pipeline.stages.map((stage) => stage.position)) + 1
      : 0;
    try {
      await this.db.$transaction(async (tx) => {
        await this.advancePipelineVersion(
          tx,
          pipelineId,
          dto.expectedPipelineVersion,
        );
        if (isEntry && !isFirstStage)
          await tx.pipelineStage.updateMany({
            where: { pipelineId },
            data: { isEntry: false, version: { increment: 1 } },
          });
        await tx.pipelineStage.create({
          data: {
            pipelineId,
            code,
            name: dto.name,
            description: dto.description ?? '',
            probability: dto.probability ?? 0,
            accent: dto.accent ?? 'slate',
            outcome: dto.outcome.toUpperCase() as LeadOutcome,
            position,
            isEntry,
          },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DomainException(
          'stage-code-taken',
          'رمز المرحلة مستخدم بالفعل في هذا المسار',
          409,
        );
      throw error;
    }
    return this.projected(pipelineId);
  }

  async updateStage(
    c: CallerContext,
    pipelineId: string,
    stageId: string,
    dto: UpdatePipelineStageDto,
  ) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const pipeline = await this.organizationPipeline(
      pipelineId,
      organizationId,
    );
    const stage = pipeline.stages.find((row) => row.id === stageId);
    if (!stage) throw new NotFoundException();
    if (dto.isEntry === false && stage.isEntry)
      throw new DomainException(
        'stage-entry-required',
        'يجب أن تبقى مرحلة واحدة نقطة دخول. اجعل مرحلة أخرى نقطة الدخول بدلاً من ذلك',
        409,
      );
    if (dto.isEntry === true && !stage.active)
      throw new DomainException(
        'stage-archived',
        'استعد المرحلة المؤرشفة قبل جعلها نقطة الدخول',
        409,
      );
    try {
      await this.db.$transaction(async (tx) => {
        await this.advancePipelineVersion(
          tx,
          pipelineId,
          dto.expectedPipelineVersion,
        );
        if (dto.isEntry === true)
          await tx.pipelineStage.updateMany({
            where: { pipelineId, id: { not: stageId } },
            data: { isEntry: false, version: { increment: 1 } },
          });
        const result = await tx.pipelineStage.updateMany({
          where: { id: stageId, pipelineId, version: dto.expectedVersion },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.description !== undefined
              ? { description: dto.description }
              : {}),
            ...(dto.probability !== undefined
              ? { probability: dto.probability }
              : {}),
            ...(dto.accent !== undefined ? { accent: dto.accent } : {}),
            ...(dto.outcome !== undefined
              ? { outcome: dto.outcome.toUpperCase() as LeadOutcome }
              : {}),
            ...(dto.isEntry !== undefined ? { isEntry: dto.isEntry } : {}),
            version: { increment: 1 },
          },
        });
        if (result.count !== 1) {
          const latest = await tx.pipelineStage.findUnique({
            where: { id: stageId },
            select: { version: true },
          });
          throw new VersionConflictException(
            latest?.version ?? dto.expectedVersion,
          );
        }
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DomainException(
          'stage-entry-conflict',
          'تم تغيير مرحلة الدخول بواسطة مستخدم آخر. حدّث الصفحة ثم أعد المحاولة',
          409,
        );
      throw error;
    }
    return this.projected(pipelineId);
  }

  async archiveStage(
    c: CallerContext,
    pipelineId: string,
    stageId: string,
    dto: PipelineStageVersionDto,
  ) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const pipeline = await this.organizationPipeline(
      pipelineId,
      organizationId,
    );
    const stage = pipeline.stages.find((row) => row.id === stageId);
    if (!stage) throw new NotFoundException();
    if (!stage.active)
      throw new DomainException(
        'invalid-transition',
        'المرحلة مؤرشفة بالفعل',
        409,
      );
    if (stage.isEntry)
      throw new DomainException(
        'stage-entry-archive',
        'لا يمكن أرشفة مرحلة نقطة الدخول. اجعل مرحلة أخرى نقطة الدخول أولاً',
        409,
      );
    const activeCount = pipeline.stages.filter((row) => row.active).length;
    if (activeCount <= 1)
      throw new DomainException(
        'pipeline-stage-required',
        'يجب أن تبقى مرحلة نشطة واحدة على الأقل',
        409,
      );
    await this.db.$transaction(async (tx) => {
      await this.advancePipelineVersion(
        tx,
        pipelineId,
        dto.expectedPipelineVersion,
      );
      const leadCount = await tx.lead.count({ where: { stageId } });
      if (leadCount > 0) throw new DependencyInUseException();
      const result = await tx.pipelineStage.updateMany({
        where: { id: stageId, pipelineId, version: dto.expectedVersion },
        data: { active: false, version: { increment: 1 } },
      });
      if (result.count !== 1) {
        const latest = await tx.pipelineStage.findUnique({
          where: { id: stageId },
          select: { version: true },
        });
        throw new VersionConflictException(latest?.version ?? stage.version);
      }
    });
    return this.projected(pipelineId);
  }

  async restoreStage(
    c: CallerContext,
    pipelineId: string,
    stageId: string,
    dto: PipelineStageVersionDto,
  ) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const pipeline = await this.organizationPipeline(
      pipelineId,
      organizationId,
    );
    const stage = pipeline.stages.find((row) => row.id === stageId);
    if (!stage) throw new NotFoundException();
    if (stage.active)
      throw new DomainException(
        'invalid-transition',
        'المرحلة نشطة بالفعل',
        409,
      );
    await this.db.$transaction(async (tx) => {
      await this.advancePipelineVersion(
        tx,
        pipelineId,
        dto.expectedPipelineVersion,
      );
      const result = await tx.pipelineStage.updateMany({
        where: { id: stageId, pipelineId, version: dto.expectedVersion },
        data: { active: true, version: { increment: 1 } },
      });
      if (result.count !== 1) {
        const latest = await tx.pipelineStage.findUnique({
          where: { id: stageId },
          select: { version: true },
        });
        throw new VersionConflictException(latest?.version ?? stage.version);
      }
    });
    return this.projected(pipelineId);
  }

  async removeStage(
    c: CallerContext,
    pipelineId: string,
    stageId: string,
    dto: PipelineStageVersionDto,
  ) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const pipeline = await this.organizationPipeline(
      pipelineId,
      organizationId,
    );
    const stage = pipeline.stages.find((row) => row.id === stageId);
    if (!stage) throw new NotFoundException();
    if (stage.version !== dto.expectedVersion)
      throw new VersionConflictException(stage.version);
    const leadCount = await this.db.lead.count({ where: { stageId } });
    if (leadCount > 0) throw new DependencyInUseException();
    if (stage.isEntry)
      throw new DomainException(
        'stage-entry-required',
        'لا يمكن حذف مرحلة نقطة الدخول. اجعل مرحلة أخرى نقطة الدخول أولاً',
        409,
      );
    if (pipeline.stages.length <= 1)
      throw new DomainException(
        'pipeline-stage-required',
        'يجب أن يحتوي كل مسار على مرحلة واحدة على الأقل',
        409,
      );
    await this.db.$transaction(async (tx) => {
      await this.advancePipelineVersion(
        tx,
        pipelineId,
        dto.expectedPipelineVersion,
      );
      try {
        const deleted = await tx.pipelineStage.deleteMany({
          where: { id: stageId, pipelineId, version: dto.expectedVersion },
        });
        if (deleted.count !== 1)
          throw new VersionConflictException(stage.version);
      } catch (error) {
        if (isFkViolation(error)) throw new DependencyInUseException();
        throw error;
      }
      const remaining = await tx.pipelineStage.findMany({
        where: { pipelineId },
        orderBy: { position: 'asc' },
      });
      for (const [index, row] of remaining.entries()) {
        if (row.position === index) continue;
        await tx.pipelineStage.update({
          where: { id: row.id },
          data: { position: index, version: { increment: 1 } },
        });
      }
    });
    return this.projected(pipelineId);
  }

  async reorder(
    c: CallerContext,
    pipelineId: string,
    dto: ReorderPipelineStagesDto,
  ) {
    this.policy.assert(c, 'pipeline.manage');
    const organizationId = await this.organizationId();
    const pipeline = await this.organizationPipeline(
      pipelineId,
      organizationId,
    );
    const ids = dto.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length)
      throw new DomainException(
        'validation',
        'قائمة الترتيب تحتوي على معرف مكرر',
        422,
      );
    if (
      pipeline.stages.length !== dto.items.length ||
      pipeline.stages.some((stage) => !ids.includes(stage.id))
    )
      throw new DomainException(
        'pipeline-stage-mismatch',
        'يجب إرسال جميع مراحل المسار عند إعادة الترتيب',
        409,
      );
    await this.db.$transaction(async (tx) => {
      const pipelineUpdate = await tx.pipeline.updateMany({
        where: { id: pipelineId, version: dto.expectedPipelineVersion },
        data: { version: { increment: 1 }, updatedAt: new Date() },
      });
      if (pipelineUpdate.count !== 1) {
        const latest = await tx.pipeline.findUnique({
          where: { id: pipelineId },
          select: { version: true },
        });
        throw new VersionConflictException(
          latest?.version ?? dto.expectedPipelineVersion,
        );
      }
      for (const [index, item] of dto.items.entries()) {
        const result = await tx.pipelineStage.updateMany({
          where: { id: item.id, version: item.expectedVersion },
          data: { position: index, version: { increment: 1 } },
        });
        if (result.count !== 1) {
          const latest = await tx.pipelineStage.findUnique({
            where: { id: item.id },
            select: { version: true },
          });
          throw new VersionConflictException(
            latest?.version ?? item.expectedVersion,
          );
        }
      }
    });
    return this.projected(pipelineId);
  }
}
