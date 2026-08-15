import { validateSync, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';
import { validationDetails } from '../../src/main';
class IdentityDto {
  @IsNotEmpty() primaryPhone!: string;
  @IsNotEmpty() name!: string;
}
class RequestDto {
  @ValidateNested() @Type(() => IdentityDto) identity!: IdentityDto;
}
describe('validation contract', () => {
  it('reports every nested error with client dot paths', () => {
    const errors = validateSync(
      plainToInstance(RequestDto, { identity: { primaryPhone: '', name: '' } }),
    );
    expect(validationDetails(errors).map(({ field }) => field)).toEqual([
      'identity.primaryPhone',
      'identity.name',
    ]);
  });
});
