import { create } from 'zustand';
import type { Game, BoardState, GameEdge, PlayerColor, GameStatePayload } from '@connectra/shared';

interface GameState {
  game: Game | GameStatePayload | null;
  board: BoardState | null;
  currentTurn: number;
  currentPlayerId: string | null;
  winnerId: string | null;
  winningPath: string[];
  lastMove: Record<string, unknown> | null;
  selectedNodeId: string | null;
  playerColors: Record<string, PlayerColor>;
  setGame: (game: Game | GameStatePayload | null) => void;
  setBoard: (board: BoardState | null) => void;
  setTurn: (turnNumber: number, currentPlayerId: string) => void;
  setWinner: (winnerId: string | null, winningPath?: string[]) => void;
  setWinningPath: (path: string[]) => void;
  setLastMove: (move: Record<string, unknown> | null) => void;
  addEdge: (edge: GameEdge) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setPlayerColors: (colors: Record<string, PlayerColor>) => void;
  reset: () => void;
}

const initialState = {
  game: null,
  board: null,
  currentTurn: 1,
  currentPlayerId: null,
  winnerId: null,
  winningPath: [],
  lastMove: null,
  selectedNodeId: null,
  playerColors: {},
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setGame: (game) => set({ game }),

  setBoard: (board) => set({ board }),

  setTurn: (currentTurn, currentPlayerId) => set({ currentTurn, currentPlayerId }),

  setWinner: (winnerId, winningPath = []) => set({ winnerId, winningPath }),

  setWinningPath: (winningPath) => set({ winningPath }),

  setLastMove: (lastMove) => set({ lastMove }),

  addEdge: (edge) =>
    set((state) => {
      if (!state.board) return state;
      return {
        board: {
          ...state.board,
          edges: [...state.board.edges, edge],
        },
      };
    }),

  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

  setPlayerColors: (colors) => set({ playerColors: colors }),

  reset: () => set(initialState),
}));
