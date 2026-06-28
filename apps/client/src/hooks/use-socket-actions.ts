import { useCallback } from 'react';
import { useSocketContext } from '../context/socket-context';
import { SocketEvent } from '@connectra/shared';
import { useRoomStore } from '../stores/room-store';
import { useGameStore } from '../stores/game-store';
import { useUIStore } from '../stores/ui-store';

export function useSocketActions() {
  const { socket } = useSocketContext();
  const { setReady } = useRoomStore();
  const { setGame } = useGameStore();
  const { setError } = useUIStore();

  const createRoom = useCallback(
    (username: string) => {
      if (!socket) return;
      const { setRoom, setPlayers } = useRoomStore.getState();
      socket.emit(SocketEvent.ROOM_CREATE, { username }, (response) => {
        if (response.ok) {
          setRoom(response.data.room);
          if (response.data.room.players) {
            setPlayers(response.data.room.players);
          }
          setGame(null);
        } else {
          setError(response.error.message);
        }
      });
    },
    [socket, setGame, setError],
  );

  const joinRoom = useCallback(
    (code: string, username: string) => {
      if (!socket) return;
      const { setRoom, setPlayers } = useRoomStore.getState();
      socket.emit(SocketEvent.ROOM_JOIN, { code, username }, (response) => {
        if (response.ok) {
          setRoom(response.data.room);
          if (response.data.room.players) {
            setPlayers(response.data.room.players);
          }
        } else {
          setError(response.error.message);
        }
      });
    },
    [socket, setError],
  );

  const leaveRoom = useCallback(() => {
    if (!socket) return;
    socket.emit(SocketEvent.ROOM_LEAVE, (response) => {
      if (!response.ok) {
        setError(response.error.message);
      }
    });
  }, [socket, setError]);

  const toggleReady = useCallback(() => {
    if (!socket) return;
    const currentReady = useRoomStore.getState().isReady;
    const newReady = !currentReady;
    socket.emit(SocketEvent.ROOM_READY, { isReady: newReady }, (response) => {
      if (response.ok) {
        setReady(newReady);
      } else {
        setError(response.error.message);
      }
    });
  }, [socket, setReady, setError]);

  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit(SocketEvent.ROOM_START, (response) => {
      if (!response.ok) {
        setError(response.error.message);
      }
    });
  }, [socket, setError]);

  const sendMove = useCallback(
    (action: { fromNodeId: string; toNodeId: string }) => {
      if (!socket) return;
      socket.emit(SocketEvent.PLAYER_MOVE, { action }, (response) => {
        if (!response.ok) {
          setError(response.error.message);
        }
      });
    },
    [socket, setError],
  );

  const reconnect = useCallback(
    (token: string) => {
      if (!socket) return;
      socket.emit(SocketEvent.PLAYER_RECONNECT, { token }, (response) => {
        if (response.ok) {
          setGame(response.data.game);
        } else {
          setError(response.error.message);
        }
      });
    },
    [socket, setGame, setError],
  );

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    sendMove,
    reconnect,
  };
}
