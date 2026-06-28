import { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface Tile {
  x: number;
  y: number;
  type: 'GRASS' | 'WATER' | 'MOUNTAIN' | 'FOREST';
}

interface GameBoardProps {
  width: number;
  height: number;
  tiles?: Tile[][];
  onTileClick?: (x: number, y: number) => void;
  selectedTile?: { x: number; y: number } | null;
  className?: string;
}

const TILE_COLORS: Record<string, string> = {
  GRASS: 'bg-green-100 hover:bg-green-200 text-green-700',
  WATER: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
  MOUNTAIN: 'bg-gray-200 hover:bg-gray-300 text-gray-600',
  FOREST: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700',
};

const TILE_ICONS: Record<string, string> = {
  GRASS: '',
  WATER: '~',
  MOUNTAIN: '^',
  FOREST: '*',
};

function generateDefaultTiles(width: number, height: number): Tile[][] {
  const types: Tile['type'][] = ['GRASS', 'WATER', 'MOUNTAIN', 'FOREST'];
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x): Tile => ({
      x,
      y,
      type: types[(x + y) % types.length],
    })),
  );
}

export function GameBoard({ width, height, tiles, onTileClick, selectedTile, className }: GameBoardProps) {
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const boardTiles = tiles || generateDefaultTiles(width, height);

  const handleClick = useCallback(
    (x: number, y: number) => {
      onTileClick?.(x, y);
    },
    [onTileClick],
  );

  return (
    <div className={cn('select-none', className)}>
      <div
        className="inline-grid gap-0.5 p-2 bg-gray-100 rounded-xl border border-gray-200"
        style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
      >
        {boardTiles.map((row, y) =>
          row.map((tile, x) => {
            const isSelected = selectedTile?.x === x && selectedTile?.y === y;
            const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;

            return (
              <button
                key={`${x}-${y}`}
                onClick={() => handleClick(x, y)}
                onMouseEnter={() => setHoveredTile({ x, y })}
                onMouseLeave={() => setHoveredTile(null)}
                className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xs font-mono transition-all duration-150',
                  TILE_COLORS[tile.type] || 'bg-gray-200',
                  isSelected && 'ring-2 ring-primary-400 ring-offset-2 ring-offset-white scale-110 z-10 shadow-soft',
                  isHovered && !isSelected && 'scale-105 z-10',
                  'focus:outline-none focus:ring-2 focus:ring-primary-400',
                )}
                title={`(${x}, ${y}) ${tile.type}`}
              >
                <span className="opacity-50">{TILE_ICONS[tile.type]}</span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
