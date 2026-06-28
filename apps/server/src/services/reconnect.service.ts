import { reconnectTokenRepo } from '../repositories/index.js';
import { generateToken } from '../utils/crypto.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';

export const reconnectService = {
  async createToken(userId: string, roomId: string) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + env.reconnect.tokenTtlMinutes * 60 * 1000);

    const reconnectToken = await reconnectTokenRepo.create({
      token,
      userId,
      roomId,
      expiresAt,
    });

    logger.info('Reconnect token created', { userId, roomId });
    return reconnectToken;
  },

  async validateToken(token: string) {
    const record = await reconnectTokenRepo.findByToken(token);
    if (!record) return null;
    if (record.usedAt) return null;
    if (record.expiresAt < new Date()) return null;

    await reconnectTokenRepo.markUsed(token);
    return { userId: record.userId, roomId: record.roomId };
  },

  async cleanup() {
    const result = await reconnectTokenRepo.deleteExpired();
    return result.count;
  },
};
