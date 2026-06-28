import { prisma } from '../lib/prisma.js';
import type { Prisma, PlayerRole } from '@prisma/client';

const ROOM_PLAYER_INCLUDE = {
  user: { select: { id: true, username: true, avatarUrl: true } },
} satisfies Prisma.RoomPlayerInclude;

export const roomPlayerRepo = {
  async findByRoom(roomId: string) {
    return prisma.roomPlayer.findMany({
      where: { roomId, leftAt: null },
      include: ROOM_PLAYER_INCLUDE,
      orderBy: { joinedAt: 'asc' },
    });
  },

  async findByUser(userId: string) {
    return prisma.roomPlayer.findMany({
      where: { userId, leftAt: null },
      include: { room: true },
    });
  },

  async findUnique(userId: string, roomId: string) {
    return prisma.roomPlayer.findUnique({
      where: { userId_roomId: { userId, roomId } },
      include: ROOM_PLAYER_INCLUDE,
    });
  },

  async addPlayer(userId: string, roomId: string, role: PlayerRole = 'PLAYER', color?: string) {
    return prisma.roomPlayer.create({
      data: { userId, roomId, role, color },
      include: ROOM_PLAYER_INCLUDE,
    });
  },

  async setReady(userId: string, roomId: string, isReady: boolean) {
    return prisma.roomPlayer.update({
      where: { userId_roomId: { userId, roomId } },
      data: { isReady },
    });
  },

  async setLeft(userId: string, roomId: string) {
    return prisma.roomPlayer.update({
      where: { userId_roomId: { userId, roomId } },
      data: { leftAt: new Date() },
    });
  },

  async countPlayers(roomId: string) {
    return prisma.roomPlayer.count({
      where: { roomId, leftAt: null, role: 'PLAYER' },
    });
  },

  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    const count = await prisma.roomPlayer.count({
      where: { userId, roomId, leftAt: null },
    });
    return count > 0;
  },
};
