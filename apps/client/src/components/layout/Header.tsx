import { Link, useNavigate } from 'react-router-dom';
import { ConnectionStatus } from '../ui/ConnectionStatus';
import { useUIStore } from '../../stores/ui-store';
import { useRoomStore } from '../../stores/room-store';

interface HeaderProps {
  showBack?: boolean;
}

export function Header({ showBack }: HeaderProps) {
  const isConnected = useUIStore((s) => s.isConnected);
  const room = useRoomStore((s) => s.room);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate('/')}
              className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold text-primary-600">Connectra</span>
          </Link>
          {room && (
            <span className="hidden sm:inline text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-full">
              {room.code}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </div>
    </header>
  );
}
