import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface TurnIndicatorProps {
  currentPlayerId: string | null;
  currentUserId: string | null;
  turnNumber: number;
  className?: string;
}

export function TurnIndicator({ currentPlayerId, currentUserId, turnNumber, className }: TurnIndicatorProps) {
  const isYourTurn = currentPlayerId === currentUserId;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Turn</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={turnNumber}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="font-mono font-semibold text-sm bg-gray-100 px-2 py-0.5 rounded-lg"
          >
            {turnNumber}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="w-px h-5 bg-gray-200" />
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          {isYourTurn ? (
            <motion.div
              key="your-turn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <motion.span
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-2 h-2 rounded-full bg-green-500"
              />
              <span className="text-sm font-medium text-green-600">Your Turn</span>
            </motion.div>
          ) : (
            <motion.div
              key="opponent-turn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-sm text-gray-400">Opponent&apos;s Turn</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
