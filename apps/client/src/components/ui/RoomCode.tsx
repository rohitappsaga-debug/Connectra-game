import { useState } from 'react';
import { cn } from '../../lib/utils';

interface RoomCodeProps {
  code: string;
  className?: string;
}

export function RoomCode({ code, className }: RoomCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors font-mono text-sm font-semibold tracking-wider shadow-soft min-h-[44px]"
      >
        {code}
        <svg
          className={cn('w-3.5 h-3.5 transition-colors', copied ? 'text-green-500' : 'text-gray-300')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {copied ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          )}
        </svg>
      </button>
      {copied && <span className="text-xs text-green-600">Copied!</span>}
    </div>
  );
}
