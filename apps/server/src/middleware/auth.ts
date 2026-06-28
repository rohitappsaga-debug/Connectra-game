import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors.js';
import { userRepo } from '../repositories/index.js';
import { logger } from '../utils/logger.js';

export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    return next(new UnauthorizedError('Missing x-user-id header'));
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return next(new UnauthorizedError('Invalid userId format'));
  }

  try {
    // Auto-create user if not exists (anonymous user provisioning)
    let user = await userRepo.findById(userId);
    if (!user) {
      user = await userRepo.create({
        id: userId,
        email: `${userId}@anonymous.local`,
        username: `player_${userId.slice(0, 8)}`,
        passwordHash: 'anonymous',
      });
      logger.info('Auto-created anonymous user via REST', { userId });
    }

    next();
  } catch (error) {
    logger.error('Auth middleware failed', { error, userId });
    next(new UnauthorizedError('Authentication failed'));
  }
}
