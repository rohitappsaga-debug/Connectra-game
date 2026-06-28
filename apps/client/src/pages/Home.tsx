import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useSocketActions } from '../hooks/use-socket-actions';
import { useSocketContext } from '../context/socket-context';
import { useRoomStore } from '../stores/room-store';
import { useUIStore } from '../stores/ui-store';

export function Home() {
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { createRoom, joinRoom } = useSocketActions();
  const room = useRoomStore((s) => s.room);
  const error = useUIStore((s) => s.error);
  const { socket, isConnected } = useSocketContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (room) {
      navigate(`/room/${room.code}`);
    }
  }, [room, navigate]);

  useEffect(() => {
    if (isCreating || isJoining) {
      setIsCreating(false);
      setIsJoining(false);
    }
  }, [room, error]);

  const handleCreate = () => {
    if (!socket?.connected || isCreating || !playerName.trim()) return;
    localStorage.setItem('playerName', playerName.trim());
    setIsCreating(true);
    createRoom(playerName.trim());
  };

  const handleJoin = () => {
    if (!joinCode.trim() || !socket?.connected || isJoining || !playerName.trim()) return;
    localStorage.setItem('playerName', playerName.trim());
    setIsJoining(true);
    joinRoom(joinCode.trim(), playerName.trim());
  };

  if (room) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-gray-900">
          Connectra
        </h1>
        <p className="text-gray-500 text-base">
          A multiplayer strategy board game. Challenge your friends in real-time.
        </p>
        {!isConnected && (
          <p className="text-amber-500 text-xs mt-2">Connecting to server...</p>
        )}
      </div>

      <div className="w-full max-w-xs space-y-5">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent shadow-soft"
          maxLength={20}
        />

        <Button
          onClick={handleCreate}
          isLoading={isCreating}
          disabled={!isConnected || !playerName.trim()}
          size="lg"
          className="w-full"
        >
          {isConnected ? 'Create Room' : 'Connecting...'}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-gray-50 px-3 text-gray-400">or join existing</span>
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Room code"
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono tracking-wider placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent shadow-soft"
            maxLength={6}
          />
          <Button onClick={handleJoin} isLoading={isJoining} variant="secondary" className="w-full" disabled={!joinCode.trim() || !isConnected || !playerName.trim()}>
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}
