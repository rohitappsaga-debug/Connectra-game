import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import type { GameNode, GameEdge, BoardState } from '@connectra/shared';
import { PlayerColor } from '@connectra/shared';
import { useGameStore } from '../../stores/game-store';
import { useSocketActions } from '../../hooks/use-socket-actions';
import { useUIStore } from '../../stores/ui-store';

interface SVGBoardProps {
  className?: string;
}

const NODE_RADIUS = 14;
const SQUARE_SIZE = 24;

// Board dimensions (must match server engine)
const CIRCLE_ROWS = 6;
const CIRCLE_COLS = 5;
const SQUARE_ROWS = 5;
const SQUARE_COLS = 5;

function isOnStartingEdge(node: GameNode, color: PlayerColor | undefined): boolean {
  if (color === PlayerColor.RED) return node.col === 0;
  if (color === PlayerColor.BLACK) return node.row === CIRCLE_ROWS - 1;
  return false;
}

export function SVGBoard({ className }: SVGBoardProps) {
  const {
    board,
    currentTurn,
    currentPlayerId,
    playerColors,
    winningPath,
    winnerId,
  } = useGameStore();
  const { sendMove } = useSocketActions();
  const { isConnected } = useUIStore();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const userIdRef = useRef<string | null>(null);
  if (userIdRef.current === null) {
    userIdRef.current = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  }
  const currentUserId = userIdRef.current;
  const isMyTurn = currentPlayerId === currentUserId;
  const isGameOver = winnerId !== null;
  const myColor = playerColors[currentUserId || ''];

  const prevTurnRef = useRef(currentTurn);
  useEffect(() => {
    if (currentTurn !== prevTurnRef.current) {
      prevTurnRef.current = currentTurn;
      setSelectedNodeId(null);
      setDragNodeId(null);
      setDragPos(null);
    }
  }, [currentTurn]);

  const edgeMap = useMemo(() => {
    const map = new Map<string, GameEdge>();
    if (board) {
      for (const edge of board.edges) {
        map.set(`${edge.fromNodeId}:${edge.toNodeId}`, edge);
        map.set(`${edge.toNodeId}:${edge.fromNodeId}`, edge);
      }
    }
    return map;
  }, [board]);

  const winningNodeSet = useMemo(() => new Set(winningPath), [winningPath]);

  const winningEdgeSet = useMemo(() => {
    if (winningPath.length < 2) return new Set<string>();
    const edgeIds = new Set<string>();
    for (let i = 0; i < winningPath.length - 1; i++) {
      const edge = edgeMap.get(`${winningPath[i]}:${winningPath[i + 1]}`);
      if (edge) edgeIds.add(edge.id);
    }
    return edgeIds;
  }, [winningPath, edgeMap]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GameNode>();
    if (board) {
      for (const node of board.nodes) {
        map.set(node.id, node);
      }
    }
    return map;
  }, [board]);

  const hasMyEdges = useMemo(() => {
    if (!board || !currentUserId) return false;
    return board.edges.some((e) => e.playerId === currentUserId);
  }, [board, currentUserId]);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const findNearestNode = useCallback(
    (x: number, y: number, excludeId?: string): GameNode | null => {
      if (!board) return null;
      let closest: GameNode | null = null;
      let minDist = 50;
      for (const node of board.nodes) {
        if (node.id === excludeId) continue;
        const dx = node.x - x;
        const dy = node.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closest = node;
        }
      }
      return closest;
    },
    [board],
  );

  const handlePointerDown = useCallback(
    (node: GameNode, e: React.PointerEvent) => {
      if (!isMyTurn || !isConnected || isGameOver) return;
      if (node.owner !== myColor) return;

      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);

      setDragNodeId(node.id);
      setSelectedNodeId(node.id);
      const pt = getSvgPoint(e.clientX, e.clientY);
      setDragPos(pt);
    },
    [isMyTurn, isConnected, isGameOver, myColor, getSvgPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragNodeId) return;
      const pt = getSvgPoint(e.clientX, e.clientY);
      setDragPos(pt);
      const target = findNearestNode(pt.x, pt.y, dragNodeId);
      setHoveredNodeId(target?.id ?? null);
    },
    [dragNodeId, getSvgPoint, findNearestNode],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragNodeId) return;

      const pt = getSvgPoint(e.clientX, e.clientY);
      const target = findNearestNode(pt.x, pt.y, dragNodeId);

      if (target && target.id !== dragNodeId) {
        sendMove({ fromNodeId: dragNodeId, toNodeId: target.id });
      }

      setDragNodeId(null);
      setDragPos(null);
      setHoveredNodeId(null);
      setSelectedNodeId(null);
    },
    [dragNodeId, getSvgPoint, findNearestNode, sendMove],
  );

  const handleNodePointerDown = useCallback(
    (node: GameNode, e: React.PointerEvent) => {
      handlePointerDown(node, e);
    },
    [handlePointerDown],
  );

  const handleSvgPointerMove = useCallback(
    (e: React.PointerEvent) => {
      handlePointerMove(e);
    },
    [handlePointerMove],
  );

  const handleSvgPointerUp = useCallback(
    (e: React.PointerEvent) => {
      handlePointerUp(e);
    },
    [handlePointerUp],
  );

  if (!board) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-gray-400', className)}>
        Waiting for board state...
      </div>
    );
  }

  const dragNode = dragNodeId ? nodeMap.get(dragNodeId) : null;
  const hoverNode = hoveredNodeId ? nodeMap.get(hoveredNodeId) : null;

  return (
    <div className={cn('w-full h-full flex items-center justify-center', className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${board.width} ${board.height}`}
        className="w-full h-full max-h-full select-none touch-none"
        xmlns="http://www.w3.org/2000/svg"
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        style={{ maxHeight: '100%' }}
      >
        <defs>
          <filter id="winning-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="selected-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hover-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {board.edges.map((edge) => {
          const fromNode = nodeMap.get(edge.fromNodeId);
          const toNode = nodeMap.get(edge.toNodeId);
          if (!fromNode || !toNode) return null;

          const isWinning = winningEdgeSet.has(edge.id);
          const isMyEdge = edge.playerId === currentUserId;
          const edgeColor = isWinning
            ? '#eab308'
            : isMyEdge
              ? '#3b82f6'
              : '#ef4444';

          const dx = toNode.x - fromNode.x;
          const dy = toNode.y - fromNode.y;
          const length = Math.sqrt(dx * dx + dy * dy);

          return (
            <line
              key={edge.id}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={edgeColor}
              strokeWidth={isWinning ? 4 : 2.5}
              strokeLinecap="round"
              filter={isWinning ? 'url(#winning-glow)' : undefined}
              className={cn('pointer-events-none', isWinning && 'winning-edge')}
              style={{
                strokeDasharray: length,
                strokeDashoffset: length,
                animation: isWinning ? undefined : 'drawEdge 0.25s ease-out forwards',
                ['--edge-length' as string]: `${length}px`,
              }}
            />
          );
        })}

        {dragNode && dragPos && (
          <line
            x1={dragNode.x}
            y1={dragNode.y}
            x2={dragPos.x}
            y2={dragPos.y}
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinecap="round"
            className="pointer-events-none"
            opacity={0.6}
          />
        )}

        {board.nodes.map((node) => {
          const isHovered = hoveredNodeId === node.id;
          const isSelected = selectedNodeId === node.id;
          const isOwnNode = node.owner === myColor;
          const isStartingEdge = isOwnNode && isOnStartingEdge(node, myColor);
          const canStart = isMyTurn && isConnected && isOwnNode && !isGameOver && (hasMyEdges || isStartingEdge);
          const canInteract = canStart;
          const isWinning = winningNodeSet.has(node.id);
          const isFirstMove = isMyTurn && !hasMyEdges && isOwnNode;
          const isMyStartingNode = isOwnNode && isOnStartingEdge(node, myColor) && !hasMyEdges;

          if (node.owner === PlayerColor.BLACK) {
            const fillColor = isWinning
              ? '#eab308'
              : isSelected
                ? '#334155'
                : isHovered && canInteract
                  ? '#374151'
                  : '#475569';
            const strokeColor = isWinning
              ? '#ca8a04'
              : isMyStartingNode
                ? '#22c55e'
                : isSelected
                  ? '#1e293b'
                  : 'transparent';
            const strokeW = isWinning || isMyStartingNode ? 2.5 : isSelected ? 2 : 0;
            return (
              <circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                r={isSelected ? NODE_RADIUS + 2 : isHovered && canInteract ? NODE_RADIUS + 1 : NODE_RADIUS}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeW}
                filter={isWinning ? 'url(#winning-glow)' : isSelected ? 'url(#selected-glow)' : isHovered && canInteract ? 'url(#hover-glow)' : undefined}
                className={cn(
                  'transition-all duration-150',
                  canInteract ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                  !canInteract && !isWinning && isFirstMove && isOwnNode && 'opacity-30',
                  !canInteract && !isWinning && !isFirstMove && 'opacity-40',
                  isWinning && 'winning-node',
                )}
                onPointerDown={(e) => handleNodePointerDown(node, e)}
                onPointerEnter={() => canInteract && setHoveredNodeId(node.id)}
                onPointerLeave={() => setHoveredNodeId(null)}
              />
            );
          }

          const halfSize = isSelected ? SQUARE_SIZE / 2 + 2 : isHovered && canInteract ? SQUARE_SIZE / 2 + 1 : SQUARE_SIZE / 2;
          const fillColor = isWinning
            ? '#eab308'
            : isSelected
              ? '#dc2626'
              : isHovered && canInteract
                ? '#f87171'
                : '#ef4444';
          const strokeColor = isWinning
            ? '#ca8a04'
            : isFirstMove && isStartingEdge
              ? '#22c55e'
              : isSelected
                ? '#991b1b'
                : 'transparent';
          const strokeW = isWinning || (isFirstMove && isStartingEdge) ? 2.5 : isSelected ? 2 : 0;
          return (
            <rect
              key={node.id}
              x={node.x - halfSize}
              y={node.y - halfSize}
              width={halfSize * 2}
              height={halfSize * 2}
              rx={5}
              ry={5}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeW}
              filter={isWinning ? 'url(#winning-glow)' : isSelected ? 'url(#selected-glow)' : isHovered && canInteract ? 'url(#hover-glow)' : undefined}
              className={cn(
                'transition-all duration-150',
                canInteract ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                !canInteract && !isWinning && isFirstMove && isOwnNode && 'opacity-30',
                !canInteract && !isWinning && !isFirstMove && 'opacity-40',
                isWinning && 'winning-node',
              )}
              onPointerDown={(e) => handleNodePointerDown(node, e)}
              onPointerEnter={() => canInteract && setHoveredNodeId(node.id)}
              onPointerLeave={() => setHoveredNodeId(null)}
            />
          );
        })}
      </svg>

      <style>{`
        @keyframes drawEdge {
          from { stroke-dashoffset: var(--edge-length, 100); }
          to { stroke-dashoffset: 0; }
        }
        @keyframes winPulse {
          0%, 100% { filter: url(#winning-glow); opacity: 1; }
          50% { filter: url(#winning-glow) brightness(1.3); opacity: 0.85; }
        }
        @keyframes winNodePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .winning-edge {
          animation: drawEdge 0.25s ease-out forwards, winPulse 1.5s ease-in-out infinite 0.25s;
        }
        .winning-node {
          transform-origin: center;
          animation: winNodePulse 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export type { GameNode, GameEdge, BoardState };
