import type { RequestHandler } from 'express';
import type { ZodType, ZodTypeDef } from 'zod';
import { parseInput } from '../utils/validation';

/**
 * Replace `req.body` with its validated, normalised form or respond 400.
 * Controllers can then safely treat `req.body` as the schema output type.
 */
export const validateBody =
  <T>(schema: ZodType<T, ZodTypeDef, unknown>): RequestHandler =>
  (req, _res, next) => {
    req.body = parseInput(schema, req.body);
    next();
  };
