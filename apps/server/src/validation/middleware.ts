import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors.js';

type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[target]);
      req[target] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        next(new BadRequestError(`Validation failed: ${message}`));
      } else {
        next(error);
      }
    }
  };
}
