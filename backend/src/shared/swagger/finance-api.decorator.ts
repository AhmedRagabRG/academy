import { applyDecorators, type Type } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
} from './api-envelope.decorator';

/**
 * The closed §4.7 error union, documented on every finance endpoint so Swagger
 * reflects the real error shapes rather than a bare 200 with a type
 * (constitution Principle XVII).
 */
const financeErrors = () =>
  ApiErrorResponses(
    'validation-failed',
    'version-conflict',
    'invoice-immutable',
    'invoice-not-payable',
    'invoice-has-payments',
    'payment-exceeds-balance',
    'installment-exceeds-remaining',
    'payment-method-inactive',
    'payment-immutable',
    'installments-not-permitted',
    'plan-has-payments',
    'reduction-exceeds-limit',
    'reduction-below-collected',
    'negative-amount',
    'invalid-currency',
    'invalid-date-range',
    'refund-exceeds-payment',
    'refund-requires-payment',
    'duplicate-number',
    'forbidden',
    'out-of-scope',
    'not-found',
    'service-unavailable',
  );

export const ApiFinanceRead = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiEnvelopeResponse(model),
    financeErrors(),
  );

export const ApiFinanceList = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiPaginatedResponse(model),
    financeErrors(),
  );

export const ApiFinanceCreate = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiCreatedResponse({ type: model }),
    financeErrors(),
  );

export const ApiFinanceMutation = <T extends Type<unknown>>(
  summary: string,
  model: T,
) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiEnvelopeResponse(model),
    financeErrors(),
  );

export const ApiFinanceCsv = (summary: string) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({
      status: 200,
      description: 'UTF-8 CSV with BOM',
      content: { 'text/csv': { schema: { type: 'string' } } },
    }),
    financeErrors(),
  );
