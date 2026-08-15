import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export function ApiEnvelopeResponse(
  status: number,
  model?: Type<unknown>,
  options: { isArray?: boolean; nullable?: boolean } = {},
): MethodDecorator {
  const data = model
    ? options.isArray
      ? { type: 'array', items: { $ref: getSchemaPath(model) } }
      : { $ref: getSchemaPath(model), nullable: options.nullable }
    : { nullable: true, example: null };
  return applyDecorators(
    ...(model ? [ApiExtraModels(model)] : []),
    ApiResponse({
      status,
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: { success: { type: 'boolean', example: true }, data },
      },
    }),
  );
}

export function ApiIdentityErrors(...statuses: number[]): MethodDecorator {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        schema: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string' },
                message: { type: 'string', example: 'تعذر تنفيذ الطلب' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      }),
    ),
  );
}
