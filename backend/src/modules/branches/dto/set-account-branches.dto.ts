import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetAccountBranchesDto {
  /** Empty means unrestricted — the account sees every branch. */
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) branchIds!: string[];
}
