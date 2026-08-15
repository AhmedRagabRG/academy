import { ApiProperty } from '@nestjs/swagger';
export class ApiResponseDto<T> {
  @ApiProperty({ example: true }) success!: true;
  data!: T;
}
export class ErrorDetailDto {
  @ApiProperty() field!: string;
  @ApiProperty() message!: string;
}
export class ApiErrorBodyDto {
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ type: [ErrorDetailDto], required: false })
  details?: ErrorDetailDto[];
}
export class ApiErrorDto {
  @ApiProperty({ example: false }) success!: false;
  @ApiProperty({ type: ApiErrorBodyDto }) error!: ApiErrorBodyDto;
}
export class PaginationMetaDto {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
