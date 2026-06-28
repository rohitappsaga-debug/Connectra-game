import { prisma } from '../lib/prisma.js';

interface CreateReconnectTokenInput {
  token: string;
  userId: string;
  roomId: string;
  expiresAt: Date;
}

export const reconnectTokenRepo = {
  async findByToken(token: string) {
    return prisma.reconnectToken.findUnique({ where: { token } });
  },

  async create(data: CreateReconnectTokenInput) {
    return prisma.reconnectToken.create({
      data: {
        token: data.token,
        roomId: data.roomId,
        expiresAt: data.expiresAt,
        user: { connect: { id: data.userId } },
      },
    });
  },

  async markUsed(token: string) {
    return prisma.reconnectToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  },

  async deleteExpired() {
    return prisma.reconnectToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  },

  async deleteByUser(userId: string) {
    return prisma.reconnectToken.deleteMany({ where: { userId } });
  },
};
