import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BoardContainerProps {
  children: ReactNode;
  className?: string;
}

export function BoardContainer({ children, className }: BoardContainerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center p-4 sm:p-6 bg-white border border-gray-200 rounded-2xl shadow-soft-md',
        className,
      )}
    >
      {children}
    </div>
  );
}
