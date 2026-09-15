import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

export function requireApiSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const provided = req.header('x-api-key') ?? req.header('authorization')?.replace(/^Bearer\s+/i, '');

  if (!provided || provided !== config.apiSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
