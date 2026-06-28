import { roomInviteRepo, roomPlayerRepo, roomRepo } from '../repositories/index.js';
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { InvitePlayerInput } from '../validation/invite.schema.js';

export const inviteService = {
  async sendInvite(senderId: string, roomId: string, input: InvitePlayerInput) {
    const room = await roomRepo.findById(roomId);
    if (!room) throw new NotFoundError('Room');
    if (room.status !== 'WAITING') throw new BadRequestError('Room is not accepting invites');

    const isSenderInRoom = await roomPlayerRepo.isUserInRoom(senderId, roomId);
    if (!isSenderInRoom) throw new ForbiddenError('Not a member of this room');

    const isReceiverInRoom = await roomPlayerRepo.isUserInRoom(input.receiverId, roomId);
    if (isReceiverInRoom) throw new ConflictError('Receiver is already in the room');

    const existing = await roomInviteRepo.existsPendingInvite(senderId, input.receiverId, roomId);
    if (existing) throw new ConflictError('Invite already pending');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const invite = await roomInviteRepo.create({
      sender: { connect: { id: senderId } },
      receiver: { connect: { id: input.receiverId } },
      room: { connect: { id: roomId } },
      message: input.message,
      expiresAt,
    });

    logger.info('Invite sent', { senderId, receiverId: input.receiverId, roomId });
    return invite;
  },

  async respondInvite(userId: string, inviteId: string, status: 'ACCEPTED' | 'DECLINED') {
    const invite = await roomInviteRepo.findById(inviteId);
    if (!invite) throw new NotFoundError('Invite');
    if (invite.receiverId !== userId) throw new ForbiddenError('Not your invite');
    if (invite.status !== 'PENDING') throw new BadRequestError('Invite already responded to');
    if (invite.expiresAt < new Date()) throw new BadRequestError('Invite expired');

    const updated = await roomInviteRepo.updateStatus(inviteId, status);

    if (status === 'ACCEPTED') {
      const playerCount = await roomPlayerRepo.countPlayers(invite.roomId);
      if (playerCount >= 2) throw new BadRequestError('Room is full');

      await roomPlayerRepo.addPlayer(userId, invite.roomId, 'PLAYER');
      logger.info('Invite accepted, player joined', { userId, roomId: invite.roomId });
    }

    return updated;
  },

  async getPendingInvites(userId: string) {
    return roomInviteRepo.findPendingForUser(userId);
  },

  async getRoomInvites(roomId: string) {
    return roomInviteRepo.findPendingForRoom(roomId);
  },

  async cleanup() {
    return roomInviteRepo.expirePending();
  },
};
