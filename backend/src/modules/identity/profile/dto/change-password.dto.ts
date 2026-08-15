import { IsInt, IsString, Min, MinLength } from 'class-validator';
import { MatchesProperty } from '../../../../shared/validation/matches-property.decorator';
export class ChangePasswordDto {
  @IsString() @MinLength(1) currentPassword!: string;
  @IsString() @MinLength(1) newPassword!: string;
  @IsString()
  @MatchesProperty('newPassword', { message: 'يجب أن تتطابق كلمتا المرور' })
  confirmPassword!: string;
  @IsInt() @Min(1) expectedVersion!: number;
}
