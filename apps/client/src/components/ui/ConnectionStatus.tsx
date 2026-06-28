import { cn } from '../../lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

export function ConnectionStatus({ isConnected, className }: ConnectionStatusProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse')} />
      <span className="text-xs text-gray-400">{isConnected ? 'Live' : 'Offline'}</span>
    </div>
  );
}
