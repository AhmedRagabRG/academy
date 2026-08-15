import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

/**
 * There is no free-form "create invoice". Invoices are raised from an
 * enrollment and are idempotent on `(enrollmentId, purpose)`, so a repeat
 * returns the existing invoices rather than duplicating them.
 */
export class RaiseInvoicesDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID(undefined, { message: 'معرّف التسجيل غير صالح' })
  enrollmentId!: string;

  @ApiProperty({
    type: [String],
    example: ['tuition', 'registration-fee'],
    description:
      'Active charge-purpose lookup codes. One invoice is raised per purpose.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'يجب تحديد غرض واحد على الأقل' })
  @ArrayMaxSize(10, { message: 'عدد الأغراض يتجاوز الحد المسموح' })
  @ArrayUnique({ message: 'لا يمكن تكرار غرض الرسوم' })
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]{2,40}$/, {
    each: true,
    message: 'غرض الرسوم غير صالح',
  })
  purposes!: string[];
}
