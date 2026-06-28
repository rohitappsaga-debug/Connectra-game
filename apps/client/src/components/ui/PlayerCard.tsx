import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface PlayerCardProps {
  username: string;
  color?: string | null;
  isReady?: boolean;
  isActive?: boolean;
  isYou?: boolean;
  className?: string;
}

export function PlayerCard({ username, color, isReady, isActive, isYou, className }: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
        isActive ? 'border-primary-200 bg-primary-50 shadow-soft' : 'border-gray-200 bg-white shadow-soft',
        className,
      )}
    >
      <motion.div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-soft"
        style={{ backgroundColor: color || '#6366f1' }}
        animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={isActive ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      >
        {username.charAt(0).toUpperCase()}
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 truncate">{username}</span>
          {isYou && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-lg"
            >
              (You)
            </motion.span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isReady !== undefined && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-lg',
              isReady ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
            )}
          >
            {isReady ? 'Ready' : 'Not Ready'}
          </motion.span>
        )}
        {isActive && (
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
        )}
      </div>
    </motion.div>
  );
}
