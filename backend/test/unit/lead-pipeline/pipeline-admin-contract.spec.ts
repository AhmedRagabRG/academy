import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PERMISSION_CATALOG } from '../../../prisma/seeds/permission-catalog';
import { PipelineAdminController } from '../../../src/modules/lead-pipeline/pipeline-admin.controller';
import {
  CreatePipelineDto,
  CreatePipelineStageDto,
  PipelineStageVersionDto,
  ReorderPipelineStagesDto,
  UpdatePipelineDto,
} from '../../../src/modules/lead-pipeline/dto/pipeline-admin.dto';

describe('Pipeline admin backend contract', () => {
  it('trims and validates a pipeline creation payload', async () => {
    const dto = plainToInstance(CreatePipelineDto, {
      code: '  admissions-2  ',
      name: '  مسار ثانٍ  ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.code).toBe('admissions-2');
    expect(dto.name).toBe('مسار ثانٍ');
  });

  it('rejects a pipeline rename without expectedVersion', async () => {
    const dto = plainToInstance(UpdatePipelineDto, { name: 'اسم جديد' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'expectedVersion')).toBe(
      true,
    );
  });

  it('defaults stage creation fields and validates the accent/outcome vocabulary', async () => {
    const dto = plainToInstance(CreatePipelineStageDto, {
      expectedPipelineVersion: 1,
      code: 'contacted',
      name: 'تم التواصل',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.description).toBe('');
    expect(dto.probability).toBe(0);
    expect(dto.accent).toBe('slate');
    expect(dto.outcome).toBe('open');
    expect(dto.isEntry).toBe(false);

    const invalid = plainToInstance(CreatePipelineStageDto, {
      expectedPipelineVersion: 1,
      code: 'x',
      name: 'y',
      accent: 'not-a-color',
    });
    expect(
      (await validate(invalid)).some((error) => error.property === 'accent'),
    ).toBe(true);
  });

  it('requires aggregate and stage versions for stage lifecycle mutations', async () => {
    const missingAggregate = plainToInstance(PipelineStageVersionDto, {
      expectedVersion: 2,
    });
    expect(
      (await validate(missingAggregate)).some(
        (error) => error.property === 'expectedPipelineVersion',
      ),
    ).toBe(true);

    const complete = plainToInstance(PipelineStageVersionDto, {
      expectedPipelineVersion: 4,
      expectedVersion: 2,
    });
    expect(await validate(complete)).toHaveLength(0);
  });

  it('validates nested reorder items', async () => {
    const dto = plainToInstance(ReorderPipelineStagesDto, {
      expectedPipelineVersion: 1,
      items: [{ id: 'not-a-uuid', expectedVersion: 1 }],
    });
    const errors = await validate(dto, { forbidUnknownValues: false });
    const nested = errors.find((error) => error.property === 'items');
    expect(nested).toBeDefined();
  });

  it('publishes the unchanged 6 pipeline permission keys', () => {
    const keys = PERMISSION_CATALOG.filter(
      (permission) => permission.moduleKey === 'pipeline',
    ).map((permission) => permission.key);
    expect(keys).toHaveLength(6);
    expect(keys).toEqual(
      expect.arrayContaining([
        'pipeline.view',
        'pipeline.create',
        'pipeline.update',
        'pipeline.move',
        'pipeline.assign',
        'pipeline.manage',
      ]),
    );
  });

  it('registers the complete pipeline admin controller surface', () => {
    const methods = Object.getOwnPropertyNames(
      PipelineAdminController.prototype,
    );
    expect(methods).toEqual(
      expect.arrayContaining([
        'list',
        'detail',
        'create',
        'update',
        'archive',
        'restore',
        'remove',
        'createStage',
        'updateStage',
        'archiveStage',
        'restoreStage',
        'removeStage',
        'reorder',
      ]),
    );
  });
});
