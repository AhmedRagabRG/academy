import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAcademicYearDto } from '../../../src/modules/organization/academic-calendar/dto/academic-year.dto';
import { AcademicTermListDto } from '../../../src/modules/organization/academic-calendar/dto/academic-term.dto';
import {
  CreateAcademicTermDto,
  UpdateAcademicTermDto,
} from '../../../src/modules/organization/academic-calendar/dto/academic-term.dto';

describe('calendar DTOs', () => {
  it('requires date-only academic-year values', async () => {
    const dto = plainToInstance(CreateAcademicYearDto, {
      name: 'عام',
      code: 'AY',
      startDate: '2026-01-01T00:00:00Z',
      endDate: 'bad',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
  it('requires a UUID year filter', async () => {
    const dto = plainToInstance(AcademicTermListDto, { academicYearId: 'bad' });
    expect(await validate(dto)).not.toHaveLength(0);
  });
  it('requires positive order and parent collection versions', async () => {
    const create = plainToInstance(CreateAcademicTermDto, {
      academicYearId: '10000000-0000-4000-8000-000000000004',
      name: 'فصل',
      startDate: '2030-01-01',
      endDate: '2030-02-01',
      order: 0,
      expectedAcademicYearVersion: 0,
    });
    expect(await validate(create)).not.toHaveLength(0);
    const update = plainToInstance(UpdateAcademicTermDto, {
      expectedVersion: 1,
      expectedAcademicYearVersion: 0,
      order: -1,
    });
    expect(await validate(update)).not.toHaveLength(0);
  });
});
