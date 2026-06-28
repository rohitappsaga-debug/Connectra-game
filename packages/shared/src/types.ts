// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export enum RoomStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum GameStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum PlayerRole {
  PLAYER = 'PLAYER',
  SPECTATOR = 'SPECTATOR',
}

export enum MoveStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  UNDO = 'UNDO',
}

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export enum TileType {
  GRASS = 'GRASS',
  WATER = 'WATER',
  MOUNTAIN = 'MOUNTAIN',
  FOREST = 'FOREST',
}

// ─────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  createdBy: string;
  maxPlayers: number;
  createdAt: Date;
  updatedAt: Date;
  players?: RoomPlayer[];
  game?: Game;
}

export interface RoomPlayer {
  id: string;
  role: PlayerRole;
  color: string | null;
  isReady: boolean;
  joinedAt: Date;
  leftAt: Date | null;
  userId: string;
  user?: User;
  roomId: string;
  room?: Room;
}

export interface Game {
  id: string;
  status: GameStatus;
  boardWidth: number;
  boardHeight: number;
  winnerId: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roomId: string;
  room?: Room;
  states?: GameState[];
  moves?: Move[];
}

export interface GameState {
  id: string;
  turnNumber: number;
  data: Record<string, unknown>;
  version: number;
  createdAt: Date;
  gameId: string;
  game?: Game;
}

export interface Move {
  id: string;
  turnNumber: number;
  playerId: string;
  action: MoveAction;
  status: MoveStatus;
  result: Record<string, unknown> | null;
  executedAt: Date;
  gameId: string;
  game?: Game;
}

export interface MoveAction {
  type: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  payload?: Record<string, unknown>;
}

export interface Connection {
  id: string;
  socketId: string;
  userAgent: string | null;
  ip: string | null;
  connectedAt: Date;
  lastPingAt: Date;
  userId: string;
  user?: User;
}

export interface ReconnectToken {
  id: string;
  token: string;
  roomId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  userId: string;
  user?: User;
}

export interface RoomInvite {
  id: string;
  status: InviteStatus;
  message: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  senderId: string;
  sender?: User;
  receiverId: string;
  receiver?: User;
  roomId: string;
  room?: Room;
}

// ─────────────────────────────────────────────
// Board (client-side rendering)
// ─────────────────────────────────────────────

export interface Board {
  width: number;
  height: number;
  tiles: Tile[][];
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
}

// ─────────────────────────────────────────────
// Connection Game Types
// ─────────────────────────────────────────────

export enum PlayerColor {
  RED = 'RED',
  BLACK = 'BLACK',
}

export interface GameNode {
  id: string;
  x: number;
  y: number;
  row: number;
  col: number;
  owner: PlayerColor;
}

export interface GameEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  playerId: string;
  turnNumber: number;
}

export interface BoardState {
  nodes: GameNode[];
  edges: GameEdge[];
  width: number;
  height: number;
}

export interface ConnectionState {
  playerId: string;
  color: PlayerColor;
  edges: GameEdge[];
}

export interface WinCondition {
  playerId: string;
  color: PlayerColor;
  hasWon: boolean;
  path: string[];
}

// ─────────────────────────────────────────────
// Move Validation
// ─────────────────────────────────────────────

export enum MoveValidationError {
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  GAME_OVER = 'GAME_OVER',
  NOT_PLAYER_TURN = 'NOT_PLAYER_TURN',
  INVALID_PLAYER = 'INVALID_PLAYER',
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  NODE_NOT_OWNED = 'NODE_NOT_OWNED',
  SAME_NODE = 'SAME_NODE',
  NOT_ADJACENT = 'NOT_ADJACENT',
  EDGE_EXISTS = 'EDGE_EXISTS',
  EDGE_CROSSES = 'EDGE_CROSSES',
  NOT_IN_ROOM = 'NOT_IN_ROOM',
  NO_ACTIVE_GAME = 'NO_ACTIVE_GAME',
}

export interface MoveValidationResult {
  valid: boolean;
  error?: MoveValidationError;
  message?: string;
  details?: Record<string, unknown>;
}
