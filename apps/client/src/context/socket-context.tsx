import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@connectra/shared';
import { SocketEvent } from '@connectra/shared';
import { useRoomStore } from '../stores/room-store';
import { useGameStore } from '../stores/game-store';
import { useUIStore } from '../stores/ui-store';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: TypedSocket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<TypedSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCleanedUpRef = useRef(false);
  const { setConnected, setError, setReconnectToken, setReconnecting } = useUIStore();
  const isConnected = useUIStore((s) => s.isConnected);
  const { setRoom, setPlayers, addPlayer, removePlayer } = useRoomStore();
  const {
    setGame,
    setTurn,
    setWinner,
    setLastMove,
    addEdge,
    setBoard,
    setPlayerColors,
  } = useGameStore();

  const scheduleReconnect = useCallback((token: string) => {
    if (isCleanedUpRef.current) return;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    const expiry = localStorage.getItem('reconnectTokenExpiry');
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem('reconnectTokenExpiry');
      useUIStore.getState().setReconnectToken(null);
      setReconnecting(false);
      setError('Reconnect token expired. Please refresh the page.');
      return;
    }

    const attempt = useUIStore.getState().reconnectAttempts || 0;
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);

    reconnectTimerRef.current = setTimeout(() => {
      if (isCleanedUpRef.current) return;
      useUIStore.getState().setReconnectAttempts(attempt + 1);
      attemptReconnect(token);
    }, delay);
  }, [setReconnecting, setError]);

  const attemptReconnect = useCallback(async (token: string) => {
    if (!socketRef.current || isCleanedUpRef.current) return;

    try {
      socketRef.current.emit(SocketEvent.PLAYER_RECONNECT, { token }, (response) => {
        if (response.ok) {
          const data = response.data;

          if (data.room) {
            setRoom(data.room);
          }

          if (data.players) {
            setPlayers(data.players);
          }

          if (data.game) {
            setGame(data.game);

            if (data.game.board) {
              setBoard(data.game.board);
            }

            if (data.game.playerColors) {
              setPlayerColors(data.game.playerColors);
            }

            if (data.game.currentTurn && data.game.currentPlayerId) {
              setTurn(data.game.currentTurn, data.game.currentPlayerId);
            }

            if (data.game.isGameOver) {
              setWinner(data.game.winnerId, data.game.winningPath);
            }
          }

          setReconnecting(false);
          useUIStore.getState().setReconnectAttempts(0);
          useUIStore.getState().setReconnectToken(null);
          localStorage.removeItem('reconnectTokenExpiry');

          setError(null);
        } else {
          setReconnecting(false);
          useUIStore.getState().setReconnectAttempts(0);
          useUIStore.getState().setReconnectToken(null);
          localStorage.removeItem('reconnectTokenExpiry');
          setError('Reconnect failed: ' + (response.error?.message ?? 'Unknown error'));
        }
      });
    } catch {
      setReconnecting(false);
      setError('Reconnect failed. Please refresh the page.');
    }
  }, [setRoom, setPlayers, setGame, setBoard, setPlayerColors, setTurn, setWinner, setReconnecting, setError]);

  useEffect(() => {
    isCleanedUpRef.current = false;

    const socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: false,
      withCredentials: true,
      auth: { userId: localStorage.getItem('userId') || 'anonymous' },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      setReconnecting(false);

      const storedToken = useUIStore.getState().reconnectToken;
      if (storedToken) {
        attemptReconnect(storedToken);
      }
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);

      if (reason !== 'io client disconnect') {
        const storedToken = useUIStore.getState().reconnectToken;
        if (storedToken) {
          setReconnecting(true);
          scheduleReconnect(storedToken);
        }
      }
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    socket.on(SocketEvent.ROOM_STATE, (room) => {
      setRoom(room);
      if (room.players) {
        setPlayers(room.players);
      }
    });

    socket.on(SocketEvent.PLAYER_JOINED, (data) => {
      if (data.player) addPlayer(data.player);
      if (data.players) setPlayers(data.players);
    });

    socket.on(SocketEvent.PLAYER_LEFT, (data) => {
      if (data.userId) removePlayer(data.userId);
      if (data.players) setPlayers(data.players);
    });

    socket.on(SocketEvent.PLAYER_DISCONNECTED, (data) => {
      const currentUserId = localStorage.getItem('userId');
      if (data.userId !== currentUserId) {
        setError(`Player ${data.userId} disconnected`);
      }
    });

    socket.on(SocketEvent.PLAYER_RECONNECTED, () => {
      setError(null);
    });

    socket.on(SocketEvent.PLAYER_RECONNECT_TOKEN, (data) => {
      setReconnectToken(data.token);
      localStorage.setItem('reconnectTokenExpiry', String(Date.now() + data.expiresIn));
    });

    socket.on(SocketEvent.READY_STATE_CHANGED, (data) => {
      if (data.players) setPlayers(data.players);
    });

    socket.on(SocketEvent.GAME_STARTED, (data) => {
      setGame(data.game);
      setRoom(data.room);
      if (data.game?.board) {
        setBoard(data.game.board);
      }
      if (data.game?.playerColors) {
        setPlayerColors(data.game.playerColors);
      }
    });

    socket.on(SocketEvent.TURN_CHANGED, (data) => {
      setTurn(data.turnNumber, data.currentPlayerId);
    });

    socket.on(SocketEvent.MOVE_PLAYED, (data) => {
      setLastMove(data);
      const payload = data.action?.payload as { edgeId?: string; fromNodeId?: string; toNodeId?: string } | undefined;
      if (payload?.edgeId && payload?.fromNodeId && payload?.toNodeId) {
        addEdge({
          id: payload.edgeId,
          fromNodeId: payload.fromNodeId,
          toNodeId: payload.toNodeId,
          playerId: data.playerId,
          turnNumber: data.turnNumber,
        });
      }
    });

    socket.on(SocketEvent.MOVE_REJECTED, (data) => {
      setError(data.reason);
    });

    socket.on(SocketEvent.GAME_FINISHED, (data) => {
      setWinner(data.winnerId, data.winningPath);
    });

    socket.on(SocketEvent.ERROR, (data) => {
      setError(data.message);
    });

    socket.connect();

    return () => {
      isCleanedUpRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
}
