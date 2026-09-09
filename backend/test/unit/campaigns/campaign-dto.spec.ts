import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCampaignDto } from '../../../src/modules/campaigns/dto/campaign.dto';

const uuid = '11111111-1111-4111-8111-111111111111';

const payload = () => ({
  name: 'حملة اليوم المفتوح',
  templateId: uuid,
  groupIds: [],
  variables: [],
  headerVariables: [],
  throttlePerMinute: 120,
});

describe('Campaign DTO contracts', () => {
  it('requires the current aggregate version for campaign updates', async () => {
    const dto = plainToInstance(UpdateCampaignDto, payload());
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'expectedVersion')).toBe(
      true,
    );
  });

  it('rejects the removed contactIds draft field under the global whitelist policy', async () => {
    const dto = plainToInstance(UpdateCampaignDto, {
      ...payload(),
      expectedVersion: 1,
      contactIds: [uuid],
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map(({ property }) => property)).toContain('contactIds');
  });
});
