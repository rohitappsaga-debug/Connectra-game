import { gameRepo, gameStateRepo, moveRepo, roomPlayerRepo } from '../repositories/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { GameEngine } from '../engine/game-engine.js';
import type { BoardState, PlayerColor, MoveValidationResult } from '@connectra/shared';
import { MoveValidationError } from '@connectra/shared';

// ─────────────────────────────────────────────
// In-memory game state cache (server authoritative)
// ─────────────────────────────────────────────

interface CachedGame {
  gameId: string;
  roomId: string;
  engine: GameEngine;
  playerIds: string[];
  currentTurn: number;
  currentPlayerIndex: number;
  isGameOver: boolean;
  winnerId: string | null;
  lastMoveAt: number;
  version: number;
  // Per-game mutex for concurrent move protection
  processing: Promise<void>;
}

const gameCache = new Map<string, CachedGame>();

// TTL for abandoned games (30 minutes)
const ABANDONED_GAME_TTL_MS = 30 * 60 * 1000;

function getCachedGame(gameId: string): CachedGame | undefined {
  return gameCache.get(gameId);
}

function getGameByRoomId(roomId: string): CachedGame | undefined {
  for (const game of gameCache.values()) {
    if (game.roomId === roomId) return game;
  }
  return undefined;
}

// ─────────────────────────────────────────────
// Game Service
// ─────────────────────────────────────────────

export const gameService = {
  async startGame(roomId: string, gameId: string) {
    const players = await roomPlayerRepo.findByRoom(roomId);
    if (players.length < 2) throw new BadRequestError('Need at least 2 players');

    const playerIds = players.map((p) => p.userId);

    // Create game engine
    const engine = new GameEngine(playerIds);

    const cached: CachedGame = {
      gameId,
      roomId,
      engine,
      playerIds,
      currentTurn: 1,
      currentPlayerIndex: 0,
      isGameOver: false,
      winnerId: null,
      lastMoveAt: Date.now(),
      version: 1,
      processing: Promise.resolve(),
    };

    gameCache.set(gameId, cached);

    // Save initial state to database
    const boardState = engine.getBoard();
    await gameStateRepo.create({
      gameId,
      turnNumber: 1,
      version: 1,
      data: {
        board: boardState,
        currentTurn: 1,
        currentPlayerIndex: 0,
        playerIds,
        playerColors: engine.getState().playerColors,
      },
    });

    logger.info('Game initialized in cache', { gameId, roomId, playerIds });
    return cached;
  },

  getCurrentPlayerId(gameId: string): string | null {
    const game = getCachedGame(gameId);
    if (!game || game.isGameOver) return null;
    return game.engine.getCurrentPlayerId();
  },

  getGameState(gameId: string) {
    const cached = getCachedGame(gameId);
    if (!cached) return null;

    const engineState = cached.engine.getState();
    return {
      gameId: cached.gameId,
      roomId: cached.roomId,
      board: cached.engine.getBoard(),
      currentTurn: cached.currentTurn,
      currentPlayerIndex: cached.currentPlayerIndex,
      playerIds: cached.playerIds,
      playerColors: engineState.playerColors,
      isGameOver: cached.isGameOver,
      winnerId: cached.winnerId,
      winCondition: engineState.winCondition,
      version: cached.version,
    };
  },

  getGameByRoom(roomId: string) {
    return getGameByRoomId(roomId) ?? null;
  },

  getBoardState(gameId: string): BoardState | null {
    const cached = getCachedGame(gameId);
    if (!cached) return null;
    return cached.engine.getBoard();
  },

  getPlayerColor(gameId: string, playerId: string): PlayerColor | null {
    const cached = getCachedGame(gameId);
    if (!cached) return null;
    return cached.engine.getPlayerColor(playerId) ?? null;
  },

  async validateMove(
    gameId: string,
    playerId: string,
    action: { fromNodeId: string; toNodeId: string },
  ): Promise<MoveValidationResult> {
    // Check if game exists in cache
    const cached = getCachedGame(gameId);
    if (!cached) {
      return {
        valid: false,
        error: MoveValidationError.GAME_NOT_FOUND,
        message: 'Game not found in memory',
        details: { gameId },
      };
    }

    // Delegate to engine for all other validations
    return cached.engine.validateMove(playerId, action.fromNodeId, action.toNodeId);
  },

  async processMove(
    gameId: string,
    playerId: string,
    action: { fromNodeId: string; toNodeId: string },
  ) {
    const cached = getCachedGame(gameId);
    if (!cached) throw new NotFoundError('Game');

    // Per-game mutex: wait for any pending move to finish
    await cached.processing;

    // Create a new promise for this move
    let resolveProcessing!: () => void;
    cached.processing = new Promise<void>((resolve) => {
      resolveProcessing = resolve;
    });

    try {
      const turnNumber = cached.currentTurn;

      // Process move in engine
      const result = cached.engine.processMove(playerId, action.fromNodeId, action.toNodeId);
      if (!result.valid) {
        throw new BadRequestError(result.message ?? 'Invalid move');
      }

      // Save move to database
      const move = await moveRepo.create({
        gameId,
        turnNumber,
        playerId,
        action: {
          type: 'connect',
          from: { x: 0, y: 0 },
          to: { x: 0, y: 0 },
          payload: { fromNodeId: action.fromNodeId, toNodeId: action.toNodeId, edgeId: result.edge?.id },
        },
        status: 'VALID',
      });

      // Sync cache state from engine (source of truth)
      const engineState = cached.engine.getState();
      cached.currentTurn = engineState.currentTurn;
      cached.currentPlayerIndex = engineState.currentPlayerIndex;
      cached.isGameOver = engineState.isGameOver;
      cached.winnerId = engineState.winnerId;
      cached.lastMoveAt = Date.now();
      cached.version++;

      // Save state snapshot to database (represents state AFTER the move)
      const boardState = cached.engine.getBoard();
      await gameStateRepo.create({
        gameId,
        turnNumber: cached.currentTurn,
        version: cached.version,
        data: {
          board: boardState,
          currentTurn: cached.currentTurn,
          currentPlayerIndex: cached.currentPlayerIndex,
          playerIds: cached.playerIds,
          playerColors: engineState.playerColors,
          lastMove: {
            playerId,
            action,
            moveId: move.id,
            edgeId: result.edge?.id,
            fromNodeId: action.fromNodeId,
            toNodeId: action.toNodeId,
          },
        },
      });

      logger.debug('Move processed', {
        gameId,
        playerId,
        turnNumber,
        moveId: move.id,
        fromNodeId: action.fromNodeId,
        toNodeId: action.toNodeId,
        isGameOver: cached.isGameOver,
      });

      const nextPlayerId = cached.engine.getCurrentPlayerId();

      return {
        moveId: move.id,
        turnNumber,
        nextTurnNumber: cached.currentTurn,
        nextPlayerId,
        isGameOver: cached.isGameOver,
        winnerId: cached.winnerId,
        edge: result.edge,
      };
    } finally {
      // Release the mutex
      resolveProcessing();
    }
  },

  async finishGame(gameId: string, winnerId: string | null) {
    const cached = getCachedGame(gameId);

    if (winnerId !== null) {
      // Single DB call to set winner and mark complete
      const updated = await gameRepo.setWinner(gameId, winnerId);
      if (cached) {
        cached.isGameOver = true;
        cached.winnerId = winnerId;
      }
      gameCache.delete(gameId);
      logger.info('Game finished', { gameId, winnerId });
      return updated;
    } else {
      // Draw: single DB call
      const updated = await gameRepo.update(gameId, { winnerId: null, status: 'COMPLETED', endedAt: new Date() });
      if (cached) {
        cached.isGameOver = true;
        cached.winnerId = null;
      }
      gameCache.delete(gameId);
      logger.info('Game finished (draw)', { gameId });
      return updated;
    }
  },

  async hydrateFromDb(gameId: string) {
    const game = await gameRepo.findById(gameId);
    if (!game || game.status === 'COMPLETED') return null;

    if (gameCache.has(gameId)) return gameCache.get(gameId);

    const players = game.room?.players ?? [];
    const playerIds = players.map((p) => p.userId);

    if (playerIds.length < 2) return null;

    // Create engine from player IDs
    const engine = new GameEngine(playerIds);

    // Load previous moves and replay them
    const moves = await moveRepo.findByGame(gameId);
    for (const move of moves) {
      const action = move.action as { payload?: { fromNodeId?: string; toNodeId?: string } };
      if (action.payload?.fromNodeId && action.payload?.toNodeId) {
        engine.processMove(move.playerId, action.payload.fromNodeId, action.payload.toNodeId);
      }
    }

    // Sync engine state after replay
    const engineState = engine.getState();

    const latestState = await gameStateRepo.findLatest(gameId);
    const version = (latestState?.version ?? 0) + 1;

    const cached: CachedGame = {
      gameId: game.id,
      roomId: game.roomId,
      engine,
      playerIds,
      currentTurn: engineState.currentTurn,
      currentPlayerIndex: engineState.currentPlayerIndex,
      isGameOver: engineState.isGameOver,
      winnerId: game.winnerId,
      lastMoveAt: Date.now(),
      version,
      processing: Promise.resolve(),
    };

    gameCache.set(gameId, cached);
    logger.info('Game hydrated from DB', {
      gameId,
      turnNumber: engineState.currentTurn,
      playerCount: playerIds.length,
      movesReplayed: moves.length,
    });
    return cached;
  },

  invalidateCache(gameId: string) {
    gameCache.delete(gameId);
  },

  // ─────────────────────────────────────────────
  // Cleanup: evict abandoned games
  // ─────────────────────────────────────────────

  cleanupAbandonedGames() {
    const now = Date.now();
    let evicted = 0;
    for (const [gameId, game] of gameCache.entries()) {
      if (now - game.lastMoveAt > ABANDONED_GAME_TTL_MS) {
        gameCache.delete(gameId);
        evicted++;
        logger.info('Evicted abandoned game from cache', { gameId, idleMinutes: Math.round((now - game.lastMoveAt) / 60000) });
      }
    }
    return evicted;
  },
};
