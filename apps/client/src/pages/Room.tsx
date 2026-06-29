import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { PlayerCard } from '../components/ui/PlayerCard';
import { RoomCode } from '../components/ui/RoomCode';
import { TurnIndicator } from '../components/game/TurnIndicator';
import { SVGBoard } from '../components/game/SVGBoard';
import { WinOverlay } from '../components/game/WinOverlay';
import { useSocketActions } from '../hooks/use-socket-actions';
import { useRoomStore } from '../stores/room-store';
import { useGameStore } from '../stores/game-store';
import { useUIStore } from '../stores/ui-store';

export function Room() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { joinRoom, leaveRoom, toggleReady, startGame } = useSocketActions();
  const { room, players, isReady } = useRoomStore();
  const { currentTurn, currentPlayerId, winnerId } = useGameStore();
  const { error, setError } = useUIStore();
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (id && !room) {
      joinRoom(id, localStorage.getItem('playerName') || 'Player');
    }
  }, [id]);

  useEffect(() => {
    if (error && !room) {
      navigate('/');
    }
  }, [error, room, navigate]);

  useEffect(() => {
    if (error && room) {
      setToast(error);
      setError(null);
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [error, room, setError]);

  const handleLeave = () => {
    leaveRoom();
    useRoomStore.getState().setRoom(null);
    useRoomStore.getState().setPlayers([]);
    useGameStore.getState().reset();
    localStorage.removeItem('playerName');
    navigate('/');
  };

  const isWaiting = room?.status === 'WAITING';
  const isPlaying = room?.status === 'IN_PROGRESS';
  const isComplete = room?.status === 'COMPLETED';
  const isCreator = room?.createdBy === currentUserId;
  const creatorPlayer = players.find((p) => p.userId === room?.createdBy);
  const joinerPlayer = players.find((p) => p.userId !== room?.createdBy);
  const otherPlayer = joinerPlayer;
  const canStart = isCreator && players.length === 2 && otherPlayer?.isReady;

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-300 border-t-primary-500 rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Joining room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden">
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0">
        <div className="w-32" />
        <div className="flex flex-col items-center gap-1">
          <RoomCode code={room.code} />
          {isWaiting && (
            <span className="text-xs text-gray-400">
              {players.length < 2 ? 'Waiting for opponent...' : 'Both players joined'}
            </span>
          )}
        </div>
        <Button onClick={handleLeave} variant="ghost" size="sm">
          Leave
        </Button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 px-4 pb-4 gap-4">
        {/* Mobile Player Header (Hidden on Desktop) */}
        <div className="flex md:hidden flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              {creatorPlayer ? (
                <PlayerCard
                  username={creatorPlayer.user?.username || 'Unknown'}
                  color={creatorPlayer.color}
                  isReady={creatorPlayer.isReady}
                  isActive={isPlaying && currentPlayerId === creatorPlayer.userId}
                  isYou={creatorPlayer.userId === currentUserId}
                  className="!p-2 text-xs"
                />
              ) : (
                <div className="p-2 border border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-[10px]">
                  Waiting...
                </div>
              )}
            </div>
            
            <div className="text-gray-400 font-bold px-1 text-xs shrink-0">VS</div>
            
            <div className="flex-1">
              {joinerPlayer ? (
                <PlayerCard
                  username={joinerPlayer.user?.username || 'Unknown'}
                  color={joinerPlayer.color}
                  isReady={joinerPlayer.isReady}
                  isActive={isPlaying && currentPlayerId === joinerPlayer.userId}
                  isYou={joinerPlayer.userId === currentUserId}
                  className="!p-2 text-xs"
                />
              ) : (
                <div className="p-2 border border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-[10px]">
                  Waiting for opponent...
                </div>
              )}
            </div>
          </div>

          {/* Action buttons / indicators on mobile */}
          {isWaiting && (
            <div className="w-full">
              {isCreator ? (
                <Button onClick={startGame} disabled={!canStart} className="w-full py-2 text-xs font-semibold" size="sm">
                  Start Game
                </Button>
              ) : (
                <Button onClick={toggleReady} variant={isReady ? 'secondary' : 'primary'} className="w-full py-2 text-xs font-semibold" size="sm">
                  {isReady ? 'Not Ready' : 'Ready Up'}
                </Button>
              )}
            </div>
          )}

          {isPlaying && (
            <div className="w-full py-2 bg-white border border-gray-200 rounded-xl px-3 flex items-center justify-between shadow-soft">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Turn {currentTurn}
              </span>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-lg",
                currentPlayerId === currentUserId ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              )}>
                {currentPlayerId === currentUserId ? "★ Your Turn" : "Opponent's Turn"}
              </span>
            </div>
          )}
        </div>

        {/* Desktop Left sidebar (Hidden on Mobile) */}
        <div className="hidden md:flex w-52 shrink-0 flex-col gap-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Players</h2>
          {creatorPlayer ? (
            <PlayerCard
              username={creatorPlayer.user?.username || 'Unknown'}
              color={creatorPlayer.color}
              isReady={creatorPlayer.isReady}
              isActive={isPlaying && currentPlayerId === creatorPlayer.userId}
              isYou={creatorPlayer.userId === currentUserId}
            />
          ) : (
            <div className="p-3 border border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-xs">
              Waiting...
            </div>
          )}

          {isWaiting && (
            <div className="mt-auto space-y-2">
              {isCreator ? (
                <Button onClick={startGame} disabled={!canStart} className="w-full" size="sm">
                  Start Game
                </Button>
              ) : (
                <Button onClick={toggleReady} variant={isReady ? 'secondary' : 'primary'} className="w-full" size="sm">
                  {isReady ? 'Not Ready' : 'Ready Up'}
                </Button>
              )}
            </div>
          )}

          {isPlaying && (
            <div className="mt-auto">
              <TurnIndicator
                currentPlayerId={currentPlayerId}
                currentUserId={currentUserId}
                turnNumber={currentTurn}
              />
            </div>
          )}

          {isComplete && (
            <div className="mt-auto text-center">
              <h2 className="text-lg font-bold mb-2">
                {winnerId ? (
                  winnerId === currentUserId ? (
                    <span className="text-green-600">You Won!</span>
                  ) : (
                    <span className="text-red-500">You Lost</span>
                  )
                ) : (
                  'Draw'
                )}
              </h2>
              <Button onClick={() => { localStorage.removeItem('playerName'); navigate('/'); }} className="w-full" size="sm">
                Back to Home
              </Button>
            </div>
          )}
        </div>

        {/* Game Board */}
        <div className="relative flex-1 min-w-0 min-h-0 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden flex flex-col items-center justify-center">
          {isPlaying && <SVGBoard className="w-full h-full max-h-full max-w-full" />}
          <WinOverlay />
          {isWaiting && (
            <div className="flex items-center justify-center h-full text-gray-400 p-4">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Game board will appear here</p>
                <p className="text-[10px] md:text-xs mt-1 text-gray-300">
                  {isCreator ? 'Start the game when your opponent is ready' : 'Ready up so the creator can start'}
                </p>
              </div>
            </div>
          )}
          {isComplete && (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  {winnerId ? (
                    winnerId === currentUserId ? (
                      <span className="text-green-600">You Won!</span>
                    ) : (
                      <span className="text-red-500">You Lost</span>
                    )
                  ) : (
                    'Draw'
                  )}
                </h2>
                <Button size="sm" onClick={() => { localStorage.removeItem('playerName'); navigate('/'); }}>Back to Home</Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Right sidebar (Hidden on Mobile) */}
        <div className="hidden md:flex w-52 shrink-0 flex-col gap-3">
          {joinerPlayer ? (
            <PlayerCard
              username={joinerPlayer.user?.username || 'Unknown'}
              color={joinerPlayer.color}
              isReady={joinerPlayer.isReady}
              isActive={isPlaying && currentPlayerId === joinerPlayer.userId}
              isYou={joinerPlayer.userId === currentUserId}
            />
          ) : (
            <div className="p-3 border border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-xs">
              Waiting for opponent...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
