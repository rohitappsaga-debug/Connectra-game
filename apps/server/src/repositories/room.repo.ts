import { prisma } from '../lib/prisma.js';
import type { Prisma, RoomStatus } from '@prisma/client';

const ROOM_INCLUDE = {
  players: {
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  },
  game: true,
} satisfies Prisma.RoomInclude;

export type RoomWithPlayers = Prisma.RoomGetPayload<{ include: typeof ROOM_INCLUDE }>;

export const roomRepo = {
  async findById(id: string) {
    return prisma.room.findUnique({ where: { id }, include: ROOM_INCLUDE });
  },

  async findByCode(code: string) {
    return prisma.room.findUnique({ where: { code }, include: ROOM_INCLUDE });
  },

  async create(data: Prisma.RoomCreateInput) {
    return prisma.room.create({ data, include: ROOM_INCLUDE });
  },

  async update(id: string, data: Prisma.RoomUpdateInput) {
    return prisma.room.update({ where: { id }, data, include: ROOM_INCLUDE });
  },

  async updateStatus(id: string, status: RoomStatus) {
    return prisma.room.update({
      where: { id },
      data: { status },
      include: ROOM_INCLUDE,
    });
  },

  async delete(id: string) {
    return prisma.room.delete({ where: { id } });
  },

  async findManyWithFilter(filter: { status?: RoomStatus; skip: number; take: number }) {
    const where: Prisma.RoomWhereInput = {};
    if (filter.status) where.status = filter.status;

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip: filter.skip,
        take: filter.take,
        orderBy: { createdAt: 'desc' },
        include: ROOM_INCLUDE,
      }),
      prisma.room.count({ where }),
    ]);

    return { rooms, total };
  },

  async findExpiredAndAbandonedRooms(waitingTtlMin: number, completedTtlMin: number, inProgressTtlMin: number) {
    const waitingCutoff = new Date(Date.now() - waitingTtlMin * 60 * 1000);
    const completedCutoff = new Date(Date.now() - completedTtlMin * 60 * 1000);
    const inProgressCutoff = new Date(Date.now() - inProgressTtlMin * 60 * 1000);

    return prisma.room.findMany({
      where: {
        OR: [
          { status: 'WAITING', createdAt: { lt: waitingCutoff } },
          { status: 'COMPLETED', updatedAt: { lt: completedCutoff } },
          { status: 'IN_PROGRESS', updatedAt: { lt: inProgressCutoff } },
        ],
      },
      include: ROOM_INCLUDE,
    });
  },

  async countPlayers(roomId: string) {
    return prisma.roomPlayer.count({
      where: { roomId, leftAt: null },
    });
  },

  async isPlayerInRoom(userId: string, roomId: string) {
    const count = await prisma.roomPlayer.count({
      where: { userId, roomId, leftAt: null },
    });
    return count > 0;
  },
};
