import { prisma } from '../lib/prisma.js';
import type { Prisma, GameStatus } from '@prisma/client';

const GAME_INCLUDE = {
  states: { orderBy: { turnNumber: 'desc' }, take: 1 },
  moves: { orderBy: { turnNumber: 'asc' } },
  room: { include: { players: { include: { user: { select: { id: true, username: true } } } } } },
} satisfies Prisma.GameInclude;

export const gameRepo = {
  async findById(id: string) {
    return prisma.game.findUnique({ where: { id }, include: GAME_INCLUDE });
  },

  async findByRoomId(roomId: string) {
    return prisma.game.findUnique({ where: { roomId }, include: GAME_INCLUDE });
  },

  async create(data: Prisma.GameCreateInput) {
    return prisma.game.create({ data, include: GAME_INCLUDE });
  },

  async update(id: string, data: Prisma.GameUpdateInput) {
    return prisma.game.update({ where: { id }, data, include: GAME_INCLUDE });
  },

  async updateStatus(id: string, status: GameStatus) {
    return prisma.game.update({
      where: { id },
      data: { status, ...(status === 'IN_PROGRESS' ? { startedAt: new Date() } : {}), ...(status === 'COMPLETED' ? { endedAt: new Date() } : {}) },
      include: GAME_INCLUDE,
    });
  },

  async setWinner(id: string, winnerId: string) {
    return prisma.game.update({
      where: { id },
      data: { winnerId, status: 'COMPLETED', endedAt: new Date() },
      include: GAME_INCLUDE,
    });
  },

  async findManyWithFilter(filter: { status?: GameStatus; skip: number; take: number }) {
    const where: Prisma.GameWhereInput = {};
    if (filter.status) where.status = filter.status;

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        skip: filter.skip,
        take: filter.take,
        orderBy: { createdAt: 'desc' },
        include: GAME_INCLUDE,
      }),
      prisma.game.count({ where }),
    ]);

    return { games, total };
  },
};
