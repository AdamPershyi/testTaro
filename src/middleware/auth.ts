import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

export function requireApiSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const queryKey = typeof req.query.key === 'string' ? req.query.key : undefined;
  const provided =
    req.header('x-api-key') ??
    req.header('authorization')?.replace(/^Bearer\s+/i, '') ??
    queryKey;

  if (!provided || provided !== config.apiSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
