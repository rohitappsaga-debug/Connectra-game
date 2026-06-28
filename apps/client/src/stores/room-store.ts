import { create } from 'zustand';
import type { Room, RoomPlayer } from '@connectra/shared';

interface RoomState {
  room: Room | null;
  players: RoomPlayer[];
  isReady: boolean;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: RoomPlayer[]) => void;
  addPlayer: (player: RoomPlayer) => void;
  removePlayer: (userId: string) => void;
  setReady: (ready: boolean) => void;
  reset: () => void;
}

const initialState = {
  room: null,
  players: [],
  isReady: false,
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,

  setRoom: (room) => set({ room }),

  setPlayers: (players) => set({ players }),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players.filter((p) => p.userId !== player.userId), player],
    })),

  removePlayer: (userId) =>
    set((state) => ({
      players: state.players.filter((p) => p.userId !== userId),
    })),

  setReady: (isReady) => set({ isReady }),

  reset: () => set(initialState),
}));
