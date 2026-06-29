import type { Server, Socket } from 'socket.io';
import { SocketEvent, MoveValidationError } from '@connectra/shared';
import type { ClientToServerEvents, ServerToClientEvents, GameStatePayload, PlayerColor, Room, RoomPlayer, Game } from '@connectra/shared';
import { logger } from '../utils/logger.js';
import { connectionService } from '../services/connection.service.js';
import { roomService } from '../services/room.service.js';
import { gameService } from '../services/game.service.js';
import { reconnectService } from '../services/reconnect.service.js';
import { roomPlayerRepo, gameRepo, userRepo } from '../repositories/index.js';
import { env } from '../utils/env.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function castRoom<T extends { id: string; code: string; status: string; createdBy: string; maxPlayers: number; createdAt: Date; updatedAt: Date }>(room: T): Room {
  return room as unknown as Room;
}

function castPlayer<T extends { id: string; userId: string; roomId: string; role: string; color: string | null; isReady: boolean; joinedAt: Date; leftAt: Date | null }>(player: T): RoomPlayer {
  return player as unknown as RoomPlayer;
}

function castPlayers<T extends { id: string; userId: string; roomId: string; role: string; color: string | null; isReady: boolean; joinedAt: Date; leftAt: Date | null }>(players: T[]): RoomPlayer[] {
  return players as unknown as RoomPlayer[];
}

// ─────────────────────────────────────────────
// In-memory socket index: userId → Set<socketId>
// ─────────────────────────────────────────────

const userSockets = new Map<string, Set<string>>();

function addSocket(userId: string, socketId: string) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.add(socketId);
  } else {
    userSockets.set(userId, new Set([socketId]));
  }
}

function removeSocket(userId: string, socketId: string): boolean {
  const sockets = userSockets.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSockets.delete(userId);
    return true;
  }
  return false;
}

function getUserSockets(userId: string): string[] {
  return Array.from(userSockets.get(userId) ?? []);
}

// ─────────────────────────────────────────────
// Auth middleware with user cache
// ─────────────────────────────────────────────

const knownUsers = new Set<string>();

async function authMiddleware(socket: TypedSocket, next: (err?: Error) => void) {
  const userId = socket.handshake.auth.userId as string | undefined;
  if (!userId || typeof userId !== 'string' || userId === 'anonymous') {
    return next(new Error('Authentication required: missing or invalid userId'));
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return next(new Error('Invalid userId format'));
  }

  try {
    if (!knownUsers.has(userId)) {
      let user = await userRepo.findById(userId);
      if (!user) {
        user = await userRepo.create({
          id: userId,
          email: `${userId}@anonymous.local`,
          username: `player_${userId.slice(0, 8)}`,
          passwordHash: 'anonymous',
        });
        logger.info('Auto-created anonymous user', { userId });
      }
      knownUsers.add(userId);
    }

    socket.data.userId = userId;
    next();
  } catch (error) {
    logger.error('Auth middleware failed', { error, userId });
    next(new Error('Authentication failed'));
  }
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

export function setupSocketHandlers(io: TypedServer) {
  io.use(authMiddleware);

  io.on('connection', async (socket: TypedSocket) => {
    const userId = socket.data.userId as string;

    // ── Duplicate connection prevention ──
    const existingSockets = getUserSockets(userId);
    if (existingSockets.length > 0) {
      logger.info('Duplicate connection detected, disconnecting old sockets', {
        userId,
        existingCount: existingSockets.length,
      });
      for (const oldSocketId of existingSockets) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.disconnect(true);
        }
        removeSocket(userId, oldSocketId);
      }
    }

    addSocket(userId, socket.id);
    logger.info('Socket connected', { socketId: socket.id, userId, totalSockets: getUserSockets(userId).length });

    // Debug: log all events received on this socket
    socket.onAny((eventName, ...args) => {
      logger.info('Socket event received', { socketId: socket.id, userId, eventName });
    });

    // Register ALL event handlers BEFORE any awaits to prevent race conditions
    // ───────────────────────────────────────
    // ROOM_CREATE
    // ───────────────────────────────────────
    socket.on(SocketEvent.ROOM_CREATE, async (data, callback) => {
      const start = Date.now();
      try {
        const username = data.username?.trim() || `player_${userId.slice(0, 8)}`;
        await userRepo.update(userId, { username });

        const room = await roomService.create(userId, { maxPlayers: env.room.maxPlayers });

        socket.join(room.id);
        socket.data.roomId = room.id;

        callback({ ok: true, data: { room: castRoom(room) } });
        logger.info('Room created via socket', { roomId: room.id, code: room.code, userId, duration: `${Date.now() - start}ms` });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create room';
        callback({ ok: false, error: { code: 'ROOM_CREATE_FAILED', message } });
        logger.error('Room create failed', { userId, duration: `${Date.now() - start}ms`, error: message });
      }
    });

    // ───────────────────────────────────────
    // ROOM_JOIN
    // ───────────────────────────────────────
    socket.on(SocketEvent.ROOM_JOIN, async (data, callback) => {
      try {
        const username = data.username?.trim() || `player_${userId.slice(0, 8)}`;
        await userRepo.update(userId, { username });

        const result = await roomService.join(userId, data.code);
        const room = result.room;

        socket.join(room.id);
        socket.data.roomId = room.id;

        const players = await roomPlayerRepo.findByRoom(room.id);

        io.to(room.id).emit(SocketEvent.PLAYER_JOINED, {
          player: castPlayer(players[players.length - 1]),
          players: castPlayers(players),
        });

        callback({ ok: true, data: { room: castRoom(room) } });
        logger.info('Room joined via socket', { roomId: room.id, userId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to join room';
        callback({ ok: false, error: { code: 'ROOM_JOIN_FAILED', message } });
      }
    });

    // ───────────────────────────────────────
    // ROOM_LEAVE
    // ───────────────────────────────────────
    socket.on(SocketEvent.ROOM_LEAVE, async (callback) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) {
        return callback({ ok: false, error: { code: 'NOT_IN_ROOM', message: 'Not in any room' } });
      }

      try {
        socket.leave(roomId);
        socket.data.roomId = undefined;

        const remaining = await roomService.leave(userId, roomId);

        if (remaining && remaining.length > 0) {
          io.to(roomId).emit(SocketEvent.PLAYER_LEFT, { userId, players: castPlayers(remaining) });
        }

        callback({ ok: true, data: undefined });
        logger.info('Room left via socket', { roomId, userId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to leave room';
        callback({ ok: false, error: { code: 'ROOM_LEAVE_FAILED', message } });
      }
    });

    // ───────────────────────────────────────
    // ROOM_READY
    // ───────────────────────────────────────
    socket.on(SocketEvent.ROOM_READY, async (data, callback) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) {
        return callback({ ok: false, error: { code: 'NOT_IN_ROOM', message: 'Not in any room' } });
      }

      try {
        const players = await roomService.setReady(userId, roomId, data.isReady);

        io.to(roomId).emit(SocketEvent.READY_STATE_CHANGED, {
          userId,
          isReady: data.isReady,
          players: castPlayers(players),
        });

        callback({ ok: true, data: { players: castPlayers(players) } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update ready state';
        callback({ ok: false, error: { code: 'READY_FAILED', message } });
      }
    });

    // ───────────────────────────────────────
    // ROOM_START
    // ───────────────────────────────────────
    socket.on(SocketEvent.ROOM_START, async (callback) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) {
        return callback({ ok: false, error: { code: 'NOT_IN_ROOM', message: 'Not in any room' } });
      }

      try {
        const canStart = await roomService.canStartGame(roomId, userId);
        if (!canStart) {
          return callback({ ok: false, error: { code: 'CANNOT_START', message: 'Only the creator can start, and the other player must be ready' } });
        }

        const result = await roomService.startGame(roomId);
        const { game } = result;

        const cached = await gameService.startGame(roomId, game.id);

        const firstPlayerId = gameService.getCurrentPlayerId(game.id);
        const engineState = gameService.getGameState(game.id);

        io.to(roomId).emit(SocketEvent.GAME_STARTED, {
          game: {
            gameId: game.id,
            board: engineState?.board ?? null,
            currentTurn: 1,
            currentPlayerId: firstPlayerId ?? '',
            playerIds: cached.playerIds,
            playerColors: engineState?.playerColors ?? {},
            isGameOver: false,
            winnerId: null,
          },
          room: castRoom(result.room),
        });
        io.to(roomId).emit(SocketEvent.TURN_CHANGED, {
          gameId: game.id,
          turnNumber: 1,
          currentPlayerId: firstPlayerId ?? '',
        });

        callback({ ok: true, data: { game: game as unknown as Game } });
        logger.info('Game started via socket', { roomId, gameId: game.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start game';
        callback({ ok: false, error: { code: 'GAME_START_FAILED', message } });
      }
    });

    // ───────────────────────────────────────
    // PLAYER_MOVE (server authoritative)
    // ───────────────────────────────────────
    socket.on(SocketEvent.PLAYER_MOVE, async (data, callback) => {
      // 1. Check room ownership
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) {
        return callback({
          ok: false,
          error: {
            code: MoveValidationError.NOT_IN_ROOM,
            message: 'Not in any room',
          },
        });
      }

      // 2. Check if player is in this room
      const isPlayerInRoom = await roomPlayerRepo.isUserInRoom(userId, roomId);
      if (!isPlayerInRoom) {
        return callback({
          ok: false,
          error: {
            code: MoveValidationError.NOT_IN_ROOM,
            message: 'You are not a player in this room',
            details: { roomId, userId },
          },
        });
      }

      // 3. Check for active game
      const game = gameService.getGameByRoom(roomId);
      if (!game) {
        return callback({
          ok: false,
          error: {
            code: MoveValidationError.NO_ACTIVE_GAME,
            message: 'No active game in this room',
            details: { roomId },
          },
        });
      }

      // 4. Server validates the move (delegates to engine)
      const validation = await gameService.validateMove(game.gameId, userId, data.action);
      if (!validation.valid) {
        callback({
          ok: false,
          error: {
            code: validation.error ?? 'INVALID_MOVE',
            message: validation.message ?? 'Invalid move',
            details: validation.details,
          },
        });
        io.to(roomId).emit(SocketEvent.MOVE_REJECTED, {
          reason: validation.message ?? 'Invalid move',
          turnNumber: game.currentTurn,
        });
        return;
      }

      try {
        const result = await gameService.processMove(game.gameId, userId, data.action);

        io.to(roomId).emit(SocketEvent.MOVE_PLAYED, {
          moveId: result.moveId,
          playerId: userId,
          turnNumber: result.turnNumber,
          action: {
            type: 'connect',
            from: { x: 0, y: 0 },
            to: { x: 0, y: 0 },
            payload: { fromNodeId: data.action.fromNodeId, toNodeId: data.action.toNodeId, edgeId: result.edge?.id },
          },
          result: null,
        });

        io.to(roomId).emit(SocketEvent.TURN_CHANGED, {
          gameId: game.gameId,
          turnNumber: result.nextTurnNumber,
          currentPlayerId: result.nextPlayerId,
        });

        // If game is over, emit game finished event with winning path
        if (result.isGameOver) {
          const gameState = gameService.getGameState(game.gameId);
          io.to(roomId).emit(SocketEvent.GAME_FINISHED, {
            gameId: game.gameId,
            winnerId: result.winnerId,
            winningPath: gameState?.winCondition?.path,
          });
          // Complete game status in DB and clear server memory cache
          await gameService.finishGame(game.gameId, result.winnerId).catch((err) => {
            logger.error('Failed to finish game in DB', { error: err, gameId: game.gameId });
          });
        }

        callback({ ok: true, data: { moveId: result.moveId, turnNumber: result.turnNumber } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to process move';
        callback({ ok: false, error: { code: 'MOVE_FAILED', message } });
      }
    });

    // ───────────────────────────────────────
    // PLAYER_RECONNECT
    // ───────────────────────────────────────
    socket.on(SocketEvent.PLAYER_RECONNECT, async (data, callback) => {
      try {
        const result = await reconnectService.validateToken(data.token);
        if (!result) {
          return callback({ ok: false, error: { code: 'INVALID_TOKEN', message: 'Reconnect token is invalid or expired' } });
        }

        const room = await roomService.getRoom(result.roomId);
        const players = await roomPlayerRepo.findByRoom(room.id);

        // Try to get game from cache, or hydrate from DB
        let cachedGame = gameService.getGameByRoom(result.roomId);
        if (!cachedGame) {
          // Cache miss (server restart) - hydrate from DB by replaying moves
          // Find the game for this room
          const gameRecord = await gameRepo.findByRoomId(result.roomId);
          if (gameRecord) {
            const hydrated = await gameService.hydrateFromDb(gameRecord.id);
            if (hydrated) cachedGame = hydrated;
          }
        }

        socket.join(room.id);
        socket.data.roomId = room.id;

        io.to(room.id).emit(SocketEvent.PLAYER_RECONNECTED, { userId });

        // Build full game state for client restoration
        let gameState: GameStatePayload | null = null;
        if (cachedGame) {
          const engineState = gameService.getGameState(cachedGame.gameId);
          const colors: Record<string, PlayerColor> = {};
          for (const pid of cachedGame.playerIds) {
            const color = gameService.getPlayerColor(cachedGame.gameId, pid);
            if (color) colors[pid] = color;
          }
          gameState = {
            gameId: cachedGame.gameId,
            board: engineState?.board ?? null,
            currentTurn: engineState?.currentTurn ?? cachedGame.currentTurn,
            currentPlayerId: gameService.getCurrentPlayerId(cachedGame.gameId),
            playerIds: cachedGame.playerIds,
            playerColors: colors,
            isGameOver: engineState?.isGameOver ?? cachedGame.isGameOver,
            winnerId: engineState?.winnerId ?? cachedGame.winnerId,
            edges: engineState?.board?.edges ?? [],
          };
        }

        callback({
          ok: true,
          data: {
            room: castRoom(room),
            players: castPlayers(players),
            game: gameState,
          },
        });
        logger.info('Player reconnected', { userId, roomId: room.id, hasGame: !!gameState });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reconnect';
        callback({ ok: false, error: { code: 'RECONNECT_FAILED', message } });
      }
    });

    // ───────────────────────────────────────
    // DISCONNECT (built-in event)
    // ───────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, userId, reason });

      removeSocket(userId, socket.id);
      await connectionService.removeConnection(socket.id);

      const roomId = socket.data.roomId as string | undefined;
      if (roomId) {
        io.to(roomId).emit(SocketEvent.PLAYER_DISCONNECTED, { userId });

        // Create reconnect token for potential reconnection
        try {
          const token = await reconnectService.createToken(userId, roomId);
          const remainingSockets = getUserSockets(userId);
          for (const sId of remainingSockets) {
            const s = io.sockets.sockets.get(sId);
            if (s) {
              s.emit(SocketEvent.PLAYER_RECONNECT_TOKEN, {
                token: token.token,
                expiresIn: env.reconnect.tokenTtlMinutes * 60 * 1000,
              });
            }
          }
        } catch (error) {
          logger.error('Failed to create reconnect token', { error, userId, roomId });
        }
      }
    });

    // Track connection AFTER all handlers are registered (non-blocking, fire-and-forget)
    connectionService.trackConnection(
      socket.id,
      userId,
      socket.handshake.headers['user-agent'],
      String(socket.handshake.address),
    ).catch((err) => {
      logger.error('Failed to track connection (non-fatal)', { error: err, userId, socketId: socket.id });
    });
  });
}
