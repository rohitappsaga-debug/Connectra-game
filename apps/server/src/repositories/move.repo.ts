import { prisma } from '../lib/prisma.js';

interface CreateMoveInput {
  gameId: string;
  turnNumber: number;
  playerId: string;
  action: Record<string, unknown>;
  status?: 'VALID' | 'INVALID' | 'UNDO';
}

export const moveRepo = {
  async findByGame(gameId: string) {
    return prisma.move.findMany({
      where: { gameId },
      orderBy: { turnNumber: 'asc' },
    });
  },

  async findLastByGame(gameId: string) {
    return prisma.move.findFirst({
      where: { gameId },
      orderBy: { executedAt: 'desc' },
    });
  },

  async create(data: CreateMoveInput) {
    return prisma.move.create({
      data: {
        gameId: data.gameId,
        turnNumber: data.turnNumber,
        playerId: data.playerId,
        action: data.action as never,
        status: data.status ?? 'VALID',
      },
    });
  },

  async countByGame(gameId: string) {
    return prisma.move.count({ where: { gameId } });
  },
};
