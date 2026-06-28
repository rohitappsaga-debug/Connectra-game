import { connectionRepo } from '../repositories/index.js';
import { logger } from '../utils/logger.js';

export const connectionService = {
  async trackConnection(socketId: string, userId: string, userAgent?: string, ip?: string) {
    const connection = await connectionRepo.create({
      socketId,
      userId,
      userAgent: userAgent || null,
      ip: ip || null,
    });

    logger.info('Connection tracked', { socketId, userId });
    return connection;
  },

  async removeConnection(socketId: string) {
    const connection = await connectionRepo.findBySocketId(socketId);
    if (connection) {
      await connectionRepo.deleteBySocketId(socketId);
      logger.info('Connection removed', { socketId, userId: connection.userId });
      return connection.userId;
    }
    return null;
  },

  async updatePing(socketId: string) {
    await connectionRepo.updateLastPing(socketId);
  },

  async isUserConnected(userId: string): Promise<boolean> {
    const connections = await connectionRepo.findByUserId(userId);
    return connections.length > 0;
  },

  async getConnections(userId: string) {
    return connectionRepo.findByUserId(userId);
  },
};
