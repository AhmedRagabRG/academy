import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Matches, Max, Min } from 'class-validator';

/**
 * The canonical money wire shape from the constitution's contract bindings:
 * a decimal string, an ISO 4217 currency, and the minor-unit digit count.
 *
 * `amount` is a string because money must never be serialized as a float.
 * Arithmetic happens in integer minor units behind this boundary.
 */
export class MoneyDto {
  @ApiProperty({ example: '18000.00' })
  @Matches(/^(0|[1-9]\d*)(\.\d+)?$/)
  amount!: string;

  @ApiProperty({ example: 'EGP' })
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ApiProperty({ minimum: 0, maximum: 6, example: 2 })
  @IsInt()
  @Min(0)
  @Max(6)
  precision!: number;
}
