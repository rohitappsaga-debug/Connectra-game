import type { Room, RoomPlayer, Game, BoardState, PlayerColor } from './types.js';

// ─────────────────────────────────────────────
// Socket Event Names
// ─────────────────────────────────────────────

export enum SocketEvent {
  // ── Client → Server ──
  ROOM_CREATE = 'room:create',
  ROOM_JOIN = 'room:join',
  ROOM_LEAVE = 'room:leave',
  ROOM_READY = 'room:ready',
  ROOM_START = 'room:start',
  PLAYER_RECONNECT = 'player:reconnect',
  PLAYER_MOVE = 'player:move',

  // ── Server → Client ──
  ROOM_CREATED = 'room:created',
  ROOM_STATE = 'room:state',
  PLAYER_JOINED = 'player:joined',
  PLAYER_LEFT = 'player:left',
  PLAYER_CONNECTED = 'player:connected',
  PLAYER_DISCONNECTED = 'player:disconnected',
  PLAYER_RECONNECTED = 'player:reconnected',
  PLAYER_RECONNECT_TOKEN = 'player:reconnect-token',
  READY_STATE_CHANGED = 'ready:state-changed',
  GAME_STARTED = 'game:started',
  TURN_CHANGED = 'turn:changed',
  MOVE_PLAYED = 'move:played',
  MOVE_REJECTED = 'move:rejected',
  GAME_FINISHED = 'game:finished',
  GAME_STATE = 'game:state',
  ERROR = 'error',
}

// ─────────────────────────────────────────────
// Acknowledgement Callback Types
// ─────────────────────────────────────────────

export interface AckSuccess<T = void> {
  ok: true;
  data: T;
}

export interface AckError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type AckCallback<T = void> = (response: AckSuccess<T> | AckError) => void;

// ─────────────────────────────────────────────
// Response Payload Types
// ─────────────────────────────────────────────

export interface RoomResponse {
  room: Room;
}

export interface RoomJoinResponse {
  room: Room;
}

export interface RoomStartResponse {
  game: Game;
}

export interface MoveResponse {
  moveId: string;
  turnNumber: number;
}

export interface PlayerReconnectResponse {
  room: Room;
  players: RoomPlayer[];
  game: GameStatePayload | null;
}

export interface GameStatePayload {
  gameId: string;
  board: BoardState | null;
  currentTurn: number;
  currentPlayerId: string | null;
  playerIds: string[];
  playerColors: Record<string, PlayerColor> | null;
  isGameOver: boolean;
  winnerId: string | null;
  winningPath?: string[];
  edges?: Array<{ id: string; fromNodeId: string; toNodeId: string; playerId: string; turnNumber: number }>;
}

// ─────────────────────────────────────────────
// Client → Server Event Payloads
// ─────────────────────────────────────────────

export interface ClientToServerEvents {
  [SocketEvent.ROOM_CREATE]: (data: { username: string }, callback: AckCallback<RoomResponse>) => void;
  [SocketEvent.ROOM_JOIN]: (data: { code: string; username: string }, callback: AckCallback<RoomJoinResponse>) => void;
  [SocketEvent.ROOM_LEAVE]: (callback: AckCallback<void>) => void;
  [SocketEvent.ROOM_READY]: (data: { isReady: boolean }, callback: AckCallback<{ players: RoomPlayer[] }>) => void;
  [SocketEvent.ROOM_START]: (callback: AckCallback<RoomStartResponse>) => void;
  [SocketEvent.PLAYER_MOVE]: (data: { action: { fromNodeId: string; toNodeId: string } }, callback: AckCallback<MoveResponse>) => void;
  [SocketEvent.PLAYER_RECONNECT]: (data: { token: string }, callback: AckCallback<PlayerReconnectResponse>) => void;
}

// ─────────────────────────────────────────────
// Server → Client Event Payloads
// ─────────────────────────────────────────────

export interface ServerToClientEvents {
  [SocketEvent.ROOM_CREATED]: (room: Room) => void;
  [SocketEvent.ROOM_STATE]: (room: Room) => void;
  [SocketEvent.PLAYER_JOINED]: (data: { player: RoomPlayer; players: RoomPlayer[] }) => void;
  [SocketEvent.PLAYER_LEFT]: (data: { userId: string; players: RoomPlayer[] }) => void;
  [SocketEvent.PLAYER_CONNECTED]: (data: { userId: string }) => void;
  [SocketEvent.PLAYER_DISCONNECTED]: (data: { userId: string }) => void;
  [SocketEvent.PLAYER_RECONNECTED]: (data: { userId: string }) => void;
  [SocketEvent.PLAYER_RECONNECT_TOKEN]: (data: { token: string; expiresIn: number }) => void;
  [SocketEvent.READY_STATE_CHANGED]: (data: { userId: string; isReady: boolean; players: RoomPlayer[] }) => void;
  [SocketEvent.GAME_STARTED]: (data: { game: GameStatePayload; room: Room }) => void;
  [SocketEvent.TURN_CHANGED]: (data: { gameId: string; turnNumber: number; currentPlayerId: string }) => void;
  [SocketEvent.MOVE_PLAYED]: (data: { moveId: string; playerId: string; turnNumber: number; action: Record<string, unknown>; result: Record<string, unknown> | null }) => void;
  [SocketEvent.MOVE_REJECTED]: (data: { reason: string; turnNumber: number }) => void;
  [SocketEvent.GAME_FINISHED]: (data: { gameId: string; winnerId: string | null; winningPath?: string[] }) => void;
  [SocketEvent.GAME_STATE]: (data: { game: Game; state: GameStatePayload }) => void;
  [SocketEvent.ERROR]: (data: { code: string; message: string }) => void;
}
