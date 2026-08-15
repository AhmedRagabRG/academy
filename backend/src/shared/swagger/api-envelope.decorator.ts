import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import {
  ApiErrorDto,
  ApiResponseDto,
  PaginationMetaDto,
} from '../dto/api-response.dto';
export const ApiEnvelopeResponse = <T extends Type<unknown>>(model: T) =>
  applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status: 200,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          { properties: { data: { $ref: getSchemaPath(model) } } },
        ],
      },
    }),
  );
export const ApiPaginatedResponse = <T extends Type<unknown>>(model: T) =>
  applyDecorators(
    ApiExtraModels(ApiResponseDto, PaginationMetaDto, model),
    ApiResponse({
      status: 200,
      schema: {
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath(PaginationMetaDto) },
        },
      },
    }),
  );
export const ApiErrorResponses = (...codes: string[]) =>
  applyDecorators(
    ApiExtraModels(ApiErrorDto),
    ApiResponse({
      status: 'default',
      description: codes.join(', '),
      type: ApiErrorDto,
    }),
  );
