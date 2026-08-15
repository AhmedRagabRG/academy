import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateOrganizationProfileDto } from '../../../src/modules/organization/profile/dto/organization-profile.dto';
import { UpdateGeneralSettingsDto } from '../../../src/modules/organization/settings/dto/general-settings.dto';

describe('profile and settings DTOs', () => {
  it('does not expose legal identity mutation fields', () => {
    expect('name' in new UpdateOrganizationProfileDto()).toBe(false);
    expect('code' in new UpdateOrganizationProfileDto()).toBe(false);
  });
  it('rejects unsupported standards and empty working days', async () => {
    const dto = plainToInstance(UpdateGeneralSettingsDto, {
      expectedVersion: 1,
      defaultLanguage: 'xx',
      timeZone: 'UTC',
      currency: 'BAD',
      dateFormat: 'x',
      numberFormat: 'x',
      workingDays: [],
      defaultBranchId: 'bad',
      defaultAcademicYearId: 'bad',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
