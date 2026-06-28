import { roomRepo, roomPlayerRepo, roomInviteRepo, gameRepo } from '../repositories/index.js';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { generateRoomCode } from '../utils/crypto.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import type { CreateRoomInput } from '../validation/room.schema.js';
import { gameService } from './game.service.js';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

export const roomService = {
  async create(userId: string, input: CreateRoomInput) {
    const code = generateRoomCode();

    const room = await roomRepo.create({
      code,
      createdBy: userId,
      maxPlayers: input.maxPlayers ?? env.room.maxPlayers,
      players: {
        create: {
          userId,
          role: 'PLAYER',
          color: COLORS[0],
          isReady: false,
        },
      },
    });

    logger.info('Room created', { roomId: room.id, code: room.code, creatorId: userId });
    return room;
  },

  async join(userId: string, code: string) {
    const room = await roomRepo.findByCode(code);
    if (!room) throw new NotFoundError('Room');
    if (room.status !== 'WAITING') throw new BadRequestError('Room is not accepting players');

    const playerCount = await roomPlayerRepo.countPlayers(room.id);
    if (playerCount >= room.maxPlayers) throw new BadRequestError('Room is full');

    const player = await roomPlayerRepo.addPlayer(userId, room.id, 'PLAYER', COLORS[playerCount % COLORS.length]);

    logger.info('Player joined room', { roomId: room.id, userId });
    return { room, player };
  },

  async leave(userId: string, roomId: string) {
    const isPlayer = await roomPlayerRepo.isUserInRoom(userId, roomId);
    if (!isPlayer) throw new NotFoundError('Player in room');

    await roomPlayerRepo.setLeft(userId, roomId);

    const remaining = await roomPlayerRepo.findByRoom(roomId);
    if (remaining.length === 0) {
      const game = gameService.getGameByRoom(roomId);
      if (game) {
        gameService.invalidateCache(game.gameId);
        logger.info('Game cache invalidated (room empty)', { gameId: game.gameId, roomId });
      }
      await roomRepo.delete(roomId);
      logger.info('Room deleted (empty)', { roomId });
      return null;
    }

    logger.info('Player left room', { roomId, userId });
    return remaining;
  },

  async delete(userId: string, roomId: string) {
    const room = await roomRepo.findById(roomId);
    if (!room) throw new NotFoundError('Room');

    const isPlayer = await roomPlayerRepo.isUserInRoom(userId, roomId);
    if (!isPlayer) throw new ForbiddenError('Not a member of this room');

    await roomInviteRepo.deleteByRoom(roomId);
    await roomRepo.delete(roomId);
    logger.info('Room deleted', { roomId, deletedBy: userId });
  },

  async getRoom(roomId: string) {
    const room = await roomRepo.findById(roomId);
    if (!room) throw new NotFoundError('Room');
    return room;
  },

  async getRoomByCode(code: string) {
    const room = await roomRepo.findByCode(code);
    if (!room) throw new NotFoundError('Room');
    return room;
  },

  async listRooms(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const { rooms, total } = await roomRepo.findManyWithFilter({ status: 'WAITING', skip, take: pageSize });
    return { rooms, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async setReady(userId: string, roomId: string, isReady: boolean) {
    const isPlayer = await roomPlayerRepo.isUserInRoom(userId, roomId);
    if (!isPlayer) throw new NotFoundError('Player in room');

    await roomPlayerRepo.setReady(userId, roomId, isReady);
    logger.info('Player ready state changed', { roomId, userId, isReady });

    const players = await roomPlayerRepo.findByRoom(roomId);
    return players;
  },

  async expireRooms() {
    const expired = await roomRepo.findExpiredRooms(env.room.expirationMinutes);
    for (const room of expired) {
      const game = gameService.getGameByRoom(room.id);
      if (game) {
        gameService.invalidateCache(game.gameId);
      }
      await roomRepo.delete(room.id);
      logger.info('Room expired and deleted', { roomId: room.id, code: room.code });
    }
    return expired.length;
  },

  async canStartGame(roomId: string, userId: string): Promise<boolean> {
    const room = await roomRepo.findById(roomId);
    if (!room || room.status !== 'WAITING') return false;
    if (room.createdBy !== userId) return false;

    const players = await roomPlayerRepo.findByRoom(roomId);
    if (players.length < 2) return false;

    const otherPlayerReady = players.some((p) => p.userId !== userId && p.isReady);
    return otherPlayerReady;
  },

  async startGame(roomId: string) {
    const room = await roomRepo.updateStatus(roomId, 'IN_PROGRESS');

    const game = await gameRepo.create({
      room: { connect: { id: roomId } },
      boardWidth: 8,
      boardHeight: 8,
    });

    logger.info('Game started', { roomId, gameId: game.id });
    return { room, game };
  },
};
