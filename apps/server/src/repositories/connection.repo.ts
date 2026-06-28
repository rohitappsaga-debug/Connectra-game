import { prisma } from '../lib/prisma.js';

interface CreateConnectionInput {
  socketId: string;
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}

export const connectionRepo = {
  async findBySocketId(socketId: string) {
    return prisma.connection.findUnique({ where: { socketId } });
  },

  async findByUserId(userId: string) {
    return prisma.connection.findMany({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
    });
  },

  async create(data: CreateConnectionInput) {
    return prisma.connection.create({
      data: {
        socketId: data.socketId,
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
        user: { connect: { id: data.userId } },
      },
    });
  },

  async updateLastPing(socketId: string) {
    return prisma.connection.update({
      where: { socketId },
      data: { lastPingAt: new Date() },
    });
  },

  async deleteBySocketId(socketId: string) {
    return prisma.connection.delete({ where: { socketId } }).catch(() => null);
  },

  async deleteByUserId(userId: string) {
    return prisma.connection.deleteMany({ where: { userId } });
  },
};
