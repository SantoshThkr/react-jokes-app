import type { ZodType, ZodTypeDef } from 'zod';
import { badRequest } from './httpError';

/**
 * Parse untrusted input with a Zod schema, turning failures into a 400
 * response that lists every invalid field.
 */
export function parseInput<T>(schema: ZodType<T, ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw badRequest(
      'Validation failed',
      result.error.issues.map((issue) => ({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    );
  }
  return result.data;
}
