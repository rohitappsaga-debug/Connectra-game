import { prisma } from '../lib/prisma.js';

interface CreateGameStateInput {
  gameId: string;
  turnNumber: number;
  version: number;
  data: Record<string, unknown>;
}

export const gameStateRepo = {
  async findLatest(gameId: string) {
    return prisma.gameState.findFirst({
      where: { gameId },
      orderBy: { turnNumber: 'desc' },
    });
  },

  async findByTurn(gameId: string, turnNumber: number) {
    return prisma.gameState.findFirst({
      where: { gameId, turnNumber },
    });
  },

  async create(data: CreateGameStateInput) {
    return prisma.gameState.create({
      data: {
        gameId: data.gameId,
        turnNumber: data.turnNumber,
        version: data.version,
        data: data.data as never,
      },
    });
  },

  async findManyForReplay(gameId: string) {
    return prisma.gameState.findMany({
      where: { gameId },
      orderBy: { turnNumber: 'asc' },
      select: {
        turnNumber: true,
        data: true,
        createdAt: true,
      },
    });
  },
};
