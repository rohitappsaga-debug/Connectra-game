import { prisma } from '../lib/prisma.js';
import type { Prisma, InviteStatus } from '@prisma/client';

const INVITE_INCLUDE = {
  sender: { select: { id: true, username: true, avatarUrl: true } },
  receiver: { select: { id: true, username: true, avatarUrl: true } },
  room: { select: { id: true, code: true, status: true } },
} satisfies Prisma.RoomInviteInclude;

export const roomInviteRepo = {
  async findById(id: string) {
    return prisma.roomInvite.findUnique({ where: { id }, include: INVITE_INCLUDE });
  },

  async findPendingForUser(userId: string) {
    return prisma.roomInvite.findMany({
      where: { receiverId: userId, status: 'PENDING', expiresAt: { gt: new Date() } },
      include: INVITE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findPendingForRoom(roomId: string) {
    return prisma.roomInvite.findMany({
      where: { roomId, status: 'PENDING', expiresAt: { gt: new Date() } },
      include: INVITE_INCLUDE,
    });
  },

  async existsPendingInvite(senderId: string, receiverId: string, roomId: string): Promise<boolean> {
    const count = await prisma.roomInvite.count({
      where: { senderId, receiverId, roomId, status: 'PENDING', expiresAt: { gt: new Date() } },
    });
    return count > 0;
  },

  async create(data: Prisma.RoomInviteCreateInput) {
    return prisma.roomInvite.create({ data, include: INVITE_INCLUDE });
  },

  async updateStatus(id: string, status: InviteStatus) {
    return prisma.roomInvite.update({
      where: { id },
      data: { status },
      include: INVITE_INCLUDE,
    });
  },

  async expirePending() {
    return prisma.roomInvite.updateMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  },

  async deleteByRoom(roomId: string) {
    return prisma.roomInvite.deleteMany({ where: { roomId } });
  },
};
