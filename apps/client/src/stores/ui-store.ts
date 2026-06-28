import { create } from 'zustand';

interface UIState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectToken: string | null;
  reconnectAttempts: number;
  error: string | null;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setReconnectToken: (token: string | null) => void;
  setReconnectAttempts: (attempts: number) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isConnected: false,
  isReconnecting: false,
  reconnectToken: null,
  reconnectAttempts: 0,
  error: null,

  setConnected: (isConnected) => set({ isConnected, isReconnecting: false, reconnectAttempts: 0 }),

  setReconnecting: (isReconnecting) => set({ isReconnecting }),

  setReconnectToken: (reconnectToken) => set({ reconnectToken }),

  setReconnectAttempts: (reconnectAttempts) => set({ reconnectAttempts }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));
