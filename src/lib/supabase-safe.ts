import type {
  FunctionsResponse,
  PostgrestResponse,
  PostgrestSingleResponse,
} from '@supabase/supabase-js';

function isResponseObject(value: unknown): value is { data: unknown; error: unknown } {
  return typeof value === 'object' && value !== null && 'data' in value && 'error' in value;
}

export function isPostgrestResponse<T>(value: unknown): value is PostgrestResponse<T> {
  return isResponseObject(value);
}

export function isPostgrestSingleResponse<T>(value: unknown): value is PostgrestSingleResponse<T> {
  return isResponseObject(value);
}

export function isFunctionsResponse<T>(value: unknown): value is FunctionsResponse<T> {
  return isResponseObject(value);
}

export function safeQuery<T>(result: unknown): T[] {
  if (!isPostgrestResponse<T>(result)) {
    throw new Error('INVALID_QUERY_RESPONSE');
  }
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export function safeQuerySingle<T>(result: unknown): T | null {
  if (!isPostgrestSingleResponse<T>(result)) {
    throw new Error('INVALID_QUERY_RESPONSE');
  }
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export function safeFunctionsInvoke<T>(result: unknown): T {
  if (!isFunctionsResponse<T>(result)) {
    throw new Error('INVALID_FUNCTION_RESPONSE');
  }
  if (result.error) {
    throw result.error;
  }
  if (!result.data) {
    throw new Error('EMPTY_RESPONSE');
  }
  return result.data;
}
