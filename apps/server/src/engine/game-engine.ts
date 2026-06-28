import type { GameNode, GameEdge, BoardState, WinCondition, MoveValidationResult } from '@connectra/shared';
import { PlayerColor, MoveValidationError } from '@connectra/shared';
import { logger } from '../utils/logger.js';

// ─────────────────────────────────────────────
// Game Engine Types
// ─────────────────────────────────────────────

export interface GameEngineState {
  board: BoardState;
  currentTurn: number;
  currentPlayerIndex: number;
  playerIds: string[];
  playerColors: Record<string, PlayerColor>;
  isGameOver: boolean;
  winnerId: string | null;
  winCondition: WinCondition | null;
}

export interface GameEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface MoveResult extends MoveValidationResult {
  edge?: GameEdge;
}

// ─────────────────────────────────────────────
// Board Constants
// ─────────────────────────────────────────────

const CIRCLE_ROWS = 6;
const CIRCLE_COLS = 5;
const SQUARE_ROWS = 5;
const SQUARE_COLS = 6;

const SPACING_X = 60;
const SPACING_Y = 60;
const PADDING = 40;

// ─────────────────────────────────────────────
// Game Engine
// ─────────────────────────────────────────────

export class GameEngine {
  private state: GameEngineState;
  private events: GameEvent[] = [];

  // Performance: O(1) node lookup by ID
  private nodeMap: Map<string, GameNode> = new Map();

  // Performance: O(1) edge existence check (both directions)
  private edgeSet: Set<string> = new Set();

  constructor(playerIds: string[]) {
    if (playerIds.length !== 2) {
      throw new Error('Game requires exactly 2 players');
    }

    const board = this.generateBoard();
    const playerColors: Record<string, PlayerColor> = {
      [playerIds[0]]: PlayerColor.RED,
      [playerIds[1]]: PlayerColor.BLACK,
    };

    this.state = {
      board,
      currentTurn: 1,
      currentPlayerIndex: 0,
      playerIds,
      playerColors,
      isGameOver: false,
      winnerId: null,
      winCondition: null,
    };

    // Build node map for O(1) lookups
    this.rebuildNodeMap();
  }

  // ─────────────────────────────────────────────
  // Board Generation
  // ─────────────────────────────────────────────

  private generateBoard(): BoardState {
    const nodes: GameNode[] = [];

    // Generate circle nodes (Player 2 - Black): 5 cols x 6 rows
    for (let row = 0; row < CIRCLE_ROWS; row++) {
      for (let col = 0; col < CIRCLE_COLS; col++) {
        nodes.push({
          id: `circle-${row}-${col}`,
          x: PADDING + col * SPACING_X,
          y: PADDING + row * SPACING_Y,
          row,
          col,
          owner: PlayerColor.BLACK,
        });
      }
    }

    // Generate square nodes (Player 1 - Red): 6 cols x 5 rows
    for (let row = 0; row < SQUARE_ROWS; row++) {
      for (let col = 0; col < SQUARE_COLS; col++) {
        const isFirstCol = col === 0;
        nodes.push({
          id: `square-${row}-${col}`,
          x: isFirstCol
            ? PADDING - SPACING_X / 2
            : PADDING + (col - 1) * SPACING_X + SPACING_X / 2,
          y: PADDING + row * SPACING_Y + SPACING_Y / 2,
          row,
          col,
          owner: PlayerColor.RED,
        });
      }
    }

    return {
      nodes,
      edges: [],
      width: Math.max((CIRCLE_COLS - 1), (SQUARE_COLS - 1)) * SPACING_X + PADDING * 2 + SPACING_X / 2,
      height: Math.max((CIRCLE_ROWS - 1), (SQUARE_ROWS - 1)) * SPACING_Y + PADDING * 2 + SPACING_Y / 2,
    };
  }

  // ─────────────────────────────────────────────
  // Performance: Rebuild lookup indexes
  // ─────────────────────────────────────────────

  private rebuildNodeMap() {
    this.nodeMap.clear();
    for (const node of this.state.board.nodes) {
      this.nodeMap.set(node.id, node);
    }
  }

  private rebuildEdgeSet() {
    this.edgeSet.clear();
    for (const edge of this.state.board.edges) {
      this.edgeSet.add(this.edgeKey(edge.fromNodeId, edge.toNodeId));
    }
  }

  private edgeKey(a: string, b: string): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  // ─────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────

  getState(): GameEngineState {
    return { ...this.state };
  }

  getBoard(): BoardState {
    return { ...this.state.board };
  }

  getEvents(): GameEvent[] {
    return [...this.events];
  }

  getCurrentPlayerId(): string {
    return this.state.playerIds[this.state.currentPlayerIndex];
  }

  getPlayerColor(playerId: string): PlayerColor | undefined {
    return this.state.playerColors[playerId];
  }

  // ─────────────────────────────────────────────
  // Move Validation (Structured)
  // ─────────────────────────────────────────────

  validateMove(
    playerId: string,
    fromNodeId: string,
    toNodeId: string,
  ): MoveResult {
    // 1. Check if game is over
    if (this.state.isGameOver) {
      return {
        valid: false,
        error: MoveValidationError.GAME_OVER,
        message: 'Game is already over!',
      };
    }

    // 2. Check if player is in the game
    const playerColor = this.state.playerColors[playerId];
    if (!playerColor) {
      return {
        valid: false,
        error: MoveValidationError.INVALID_PLAYER,
        message: 'You are not a player in this game.',
      };
    }

    // 3. Check turn order
    const currentPlayerId = this.getCurrentPlayerId();
    if (playerId !== currentPlayerId) {
      return {
        valid: false,
        error: MoveValidationError.NOT_PLAYER_TURN,
        message: "It's not your turn yet — hang tight!",
      };
    }

    // 4. Check if nodes exist
    const fromNode = this.nodeMap.get(fromNodeId);
    const toNode = this.nodeMap.get(toNodeId);

    if (!fromNode) {
      return {
        valid: false,
        error: MoveValidationError.NODE_NOT_FOUND,
        message: "That starting node doesn't exist on the board.",
      };
    }

    if (!toNode) {
      return {
        valid: false,
        error: MoveValidationError.NODE_NOT_FOUND,
        message: "That target node doesn't exist on the board.",
      };
    }

    // 5. Check if player owns both nodes
    if (fromNode.owner !== playerColor) {
      return {
        valid: false,
        error: MoveValidationError.NODE_NOT_OWNED,
        message: playerColor === PlayerColor.RED
          ? 'You can only start from your red squares — try picking a red one!'
          : 'You can only start from your dark circles — try picking a dark one!',
      };
    }

    if (toNode.owner !== playerColor) {
      return {
        valid: false,
        error: MoveValidationError.NODE_NOT_OWNED,
        message: playerColor === PlayerColor.RED
          ? "You can't connect to your opponent's circle — pick one of your red squares!"
          : "You can't connect to your opponent's square — pick one of your dark circles!",
      };
    }

    // 6. Check starting edge: first move must start from the starting edge
    //    Red starts from left column (col 0), Black starts from bottom row
    const hasEdges = this.state.board.edges.some((e) => e.playerId === playerId);
    if (!hasEdges) {
      let isOnStartingEdge = false;
      if (playerColor === PlayerColor.RED) {
        isOnStartingEdge = fromNode.col === 0;
      } else {
        isOnStartingEdge = fromNode.row === CIRCLE_ROWS - 1;
      }

      if (!isOnStartingEdge) {
        return {
          valid: false,
          error: MoveValidationError.NOT_ADJACENT,
          message: playerColor === PlayerColor.RED
            ? 'Your first connection must start from the left edge! Pick a square on the far left column.'
            : "Your first connection must start from the bottom edge! Pick a circle on the bottom row.",
        };
      }
    }

    // 7. Check if nodes are the same
    if (fromNodeId === toNodeId) {
      return {
        valid: false,
        error: MoveValidationError.SAME_NODE,
        message: "You can't connect a node to itself — pick a different one!",
      };
    }

    // 8. Check if nodes are adjacent
    if (!this.areNodesAdjacent(fromNode, toNode)) {
      return {
        valid: false,
        error: MoveValidationError.NOT_ADJACENT,
        message: "Those nodes are too far apart — try connecting to a nearby one!",
      };
    }

    // 9. Check if edge already exists
    const edgeKey = this.edgeKey(fromNodeId, toNodeId);
    if (this.edgeSet.has(edgeKey)) {
      return {
        valid: false,
        error: MoveValidationError.EDGE_EXISTS,
        message: "You've already connected those two — try a different path!",
      };
    }

    // 10. Check if edge crosses existing edges
    const crossingEdge = this.findCrossingEdge(fromNode, toNode);
    if (crossingEdge) {
      return {
        valid: false,
        error: MoveValidationError.EDGE_CROSSES,
        message: "That line would cross an existing connection — pick a different route!",
      };
    }

    return { valid: true };
  }

  // ─────────────────────────────────────────────
  // Adjacency Check
  // ─────────────────────────────────────────────

  private areNodesAdjacent(node1: GameNode, node2: GameNode): boolean {
    const dx = Math.abs(node1.x - node2.x);
    const dy = Math.abs(node1.y - node2.y);

    // Adjacent if within one spacing unit (horizontal, vertical, or diagonal)
    const maxDistance = SPACING_X * 1.1; // Slightly more than spacing for floating point
    return dx <= maxDistance && dy <= maxDistance && (dx > 0 || dy > 0);
  }

  // ─────────────────────────────────────────────
  // Edge Crossing Check
  // ─────────────────────────────────────────────

  private findCrossingEdge(fromNode: GameNode, toNode: GameNode): GameEdge | null {
    for (const edge of this.state.board.edges) {
      const edgeFromNode = this.nodeMap.get(edge.fromNodeId);
      const edgeToNode = this.nodeMap.get(edge.toNodeId);

      if (!edgeFromNode || !edgeToNode) continue;

      if (edge.fromNodeId === fromNode.id || edge.fromNodeId === toNode.id ||
          edge.toNodeId === fromNode.id || edge.toNodeId === toNode.id) {
        continue;
      }

      if (this.doSegmentsIntersect(fromNode, toNode, edgeFromNode, edgeToNode)) {
        return edge;
      }
    }
    return null;
  }

  private doSegmentsIntersect(
    p1: GameNode,
    p2: GameNode,
    p3: GameNode,
    p4: GameNode,
  ): boolean {
    const d1 = this.direction(p3, p4, p1);
    const d2 = this.direction(p3, p4, p2);
    const d3 = this.direction(p1, p2, p3);
    const d4 = this.direction(p1, p2, p4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }

    if (d1 === 0 && this.onSegment(p3, p4, p1)) return true;
    if (d2 === 0 && this.onSegment(p3, p4, p2)) return true;
    if (d3 === 0 && this.onSegment(p1, p2, p3)) return true;
    if (d4 === 0 && this.onSegment(p1, p2, p4)) return true;

    return false;
  }

  private direction(p1: GameNode, p2: GameNode, p3: GameNode): number {
    return (p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x);
  }

  private onSegment(p1: GameNode, p2: GameNode, p3: GameNode): boolean {
    return (
      p3.x >= Math.min(p1.x, p2.x) &&
      p3.x <= Math.max(p1.x, p2.x) &&
      p3.y >= Math.min(p1.y, p2.y) &&
      p3.y <= Math.max(p1.y, p2.y)
    );
  }

  // ─────────────────────────────────────────────
  // Process Move
  // ─────────────────────────────────────────────

  processMove(
    playerId: string,
    fromNodeId: string,
    toNodeId: string,
  ): MoveResult {
    const validation = this.validateMove(playerId, fromNodeId, toNodeId);
    if (!validation.valid) {
      return validation;
    }

    // Create the edge
    const edge: GameEdge = {
      id: `edge-${this.state.currentTurn}-${playerId}`,
      fromNodeId,
      toNodeId,
      playerId,
      turnNumber: this.state.currentTurn,
    };

    // Add edge to board and update index
    this.state.board.edges.push(edge);
    this.edgeSet.add(this.edgeKey(fromNodeId, toNodeId));

    // Log event
    const event: GameEvent = {
      type: 'move',
      payload: { playerId, fromNodeId, toNodeId, edgeId: edge.id },
      timestamp: Date.now(),
    };
    this.events.push(event);

    // Check win condition
    const winCondition = this.checkWinCondition(playerId);
    if (winCondition?.hasWon) {
      this.state.isGameOver = true;
      this.state.winnerId = playerId;
      this.state.winCondition = winCondition;

      const winEvent: GameEvent = {
        type: 'game_over',
        payload: { playerId, winCondition },
        timestamp: Date.now(),
      };
      this.events.push(winEvent);
    } else {
      // Switch turns
      this.state.currentTurn++;
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 2;
    }

    logger.debug('Move processed', {
      turn: this.state.currentTurn,
      playerId,
      fromNodeId,
      toNodeId,
      isGameOver: this.state.isGameOver,
    });

    return { valid: true, edge };
  }

  // ─────────────────────────────────────────────
  // Win Condition Check (Optimized DFS)
  // ─────────────────────────────────────────────

  private checkWinCondition(playerId: string): WinCondition | null {
    const color = this.state.playerColors[playerId];
    if (!color) return null;

    // Get all edges for this player
    const playerEdges = this.state.board.edges.filter((e) => e.playerId === playerId);

    // Get all nodes owned by this player
    const playerNodes = this.state.board.nodes.filter((n) => n.owner === color);

    // Build adjacency list using Set for O(1) lookups
    const adjacencyList = new Map<string, Set<string>>();
    for (const node of playerNodes) {
      adjacencyList.set(node.id, new Set());
    }

    for (const edge of playerEdges) {
      const neighbors1 = adjacencyList.get(edge.fromNodeId);
      const neighbors2 = adjacencyList.get(edge.toNodeId);
      if (neighbors1) neighbors1.add(edge.toNodeId);
      if (neighbors2) neighbors2.add(edge.fromNodeId);
    }

    // Create goal set for O(1) membership check
    let goalNodes: GameNode[];
    let startNodes: GameNode[];

    if (color === PlayerColor.RED) {
      // Red: Left (col 0) to Right (col SQUARE_COLS - 1)
      startNodes = playerNodes.filter((n) => n.col === 0);
      goalNodes = playerNodes.filter((n) => n.col === SQUARE_COLS - 1);
    } else {
      // Black: Bottom (row CIRCLE_ROWS - 1) to Top (row 0)
      startNodes = playerNodes.filter((n) => n.row === CIRCLE_ROWS - 1);
      goalNodes = playerNodes.filter((n) => n.row === 0);
    }

    const goalSet = new Set(goalNodes.map((n) => n.id));

    // Try DFS from each start node
    for (const startNode of startNodes) {
      const path: string[] = [];
      if (this.dfs(startNode.id, goalSet, adjacencyList, new Set(), path)) {
        return { playerId, color, hasWon: true, path };
      }
    }

    return { playerId, color, hasWon: false, path: [] };
  }

  /**
   * Iterative DFS with correct path tracking.
   * Uses explicit stack to avoid call stack overflow on large boards.
   */
  private dfs(
    startId: string,
    goalSet: Set<string>,
    adjacencyList: Map<string, Set<string>>,
    visited: Set<string>,
    path: string[],
  ): boolean {
    // Each stack entry: [nodeId, pathIndex]
    // pathIndex tracks where this node sits in the path array
    const stack: [string, number][] = [[startId, 0]];
    visited.add(startId);
    path.push(startId);

    while (stack.length > 0) {
      const current = stack[stack.length - 1][0];
      const pathIdx = stack[stack.length - 1][1];

      // Found goal - path is already built correctly up to this point
      if (goalSet.has(current)) {
        path.length = pathIdx + 1; // Trim path to current position
        return true;
      }

      // Try to find an unvisited neighbor
      const neighbors = adjacencyList.get(current) ?? new Set();
      let found = false;

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          // Ensure path has room for this entry
          if (path.length <= pathIdx + 1) {
            path.push(neighbor);
          } else {
            path[pathIdx + 1] = neighbor;
          }
          stack.push([neighbor, pathIdx + 1]);
          found = true;
          break;
        }
      }

      if (!found) {
        // Backtrack
        stack.pop();
        // Don't pop from path here - we'll overwrite on next push
        // Only trim if we're going back to parent level
        if (stack.length > 0) {
          const parentIdx = stack[stack.length - 1][1];
          path.length = parentIdx + 1;
        }
      }
    }

    return false;
  }

  // ─────────────────────────────────────────────
  // Snapshot / Restore
  // ─────────────────────────────────────────────

  snapshot(): Record<string, unknown> {
    return {
      board: this.state.board,
      currentTurn: this.state.currentTurn,
      currentPlayerIndex: this.state.currentPlayerIndex,
      playerIds: this.state.playerIds,
      playerColors: this.state.playerColors,
      isGameOver: this.state.isGameOver,
      winnerId: this.state.winnerId,
      winCondition: this.state.winCondition,
      eventCount: this.events.length,
    };
  }

  restore(snapshot: Record<string, unknown>) {
    this.state.board = snapshot.board as BoardState;
    this.state.currentTurn = snapshot.currentTurn as number;
    this.state.currentPlayerIndex = snapshot.currentPlayerIndex as number;
    this.state.playerIds = snapshot.playerIds as string[];
    this.state.playerColors = snapshot.playerColors as Record<string, PlayerColor>;
    this.state.isGameOver = snapshot.isGameOver as boolean;
    this.state.winnerId = snapshot.winnerId as string | null;
    this.state.winCondition = snapshot.winCondition as WinCondition | null;

    // Rebuild lookup indexes after restore
    this.rebuildNodeMap();
    this.rebuildEdgeSet();
  }
}
