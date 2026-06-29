import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';
import { useGameStore } from '../../stores/game-store';
import { useRoomStore } from '../../stores/room-store';
import { useSocketActions } from '../../hooks/use-socket-actions';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  life: number;
}

const CONFETTI_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#ec4899', '#f97316'];
const PARTICLE_COUNT = 80;

export function WinOverlay() {
  const { winnerId } = useGameStore();
  const { room } = useRoomStore();
  const { leaveRoom } = useSocketActions();
  const navigate = useNavigate();
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const isWinner = winnerId === currentUserId;
  const [show, setShow] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (winnerId) {
      const t = setTimeout(() => setShow(true), 200);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [winnerId]);

  const initParticles = useCallback(() => {
    const ps: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      ps.push({
        id: i,
        x: 50 + Math.random() * 0,
        y: -5 - Math.random() * 10,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2 + 1,
        size: Math.random() * 6 + 3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        life: 1,
      });
    }
    particlesRef.current = ps;
    setParticles([...ps]);
  }, []);

  useEffect(() => {
    if (!show) return;
    initParticles();

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const ps = particlesRef.current;
      let alive = false;
      for (const p of ps) {
        p.x += p.vx * dt * 50;
        p.y += p.vy * dt * 50;
        p.vy += 0.8 * dt;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.life -= dt * 0.3;
        if (p.life > 0 && p.y < 120) alive = true;
      }

      if (alive) {
        setParticles([...ps]);
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [show, initParticles]);

  const handleLeave = () => {
    leaveRoom();
    useRoomStore.getState().setRoom(null);
    useRoomStore.getState().setPlayers([]);
    useGameStore.getState().reset();
    navigate('/');
  };

  if (!show || !winnerId) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* Confetti */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {particles.map((p) =>
          p.life > 0 ? (
            <rect
              key={p.id}
              x={p.x}
              y={p.y}
              width={p.size * 0.3}
              height={p.size * 0.15}
              fill={p.color}
              opacity={Math.min(p.life, 1)}
              transform={`rotate(${p.rotation} ${p.x} ${p.y})`}
            />
          ) : null,
        )}
      </svg>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
        <div
          className={cn(
            'bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl px-6 py-8 sm:px-12 sm:py-10 text-center transform transition-all duration-700',
            show ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        >
          <div className="text-4xl sm:text-6xl mb-4">{isWinner ? '🏆' : '🎯'}</div>
          <h2
            className={cn(
              'text-2xl sm:text-4xl font-bold mb-3',
              isWinner ? 'text-yellow-600' : 'text-gray-700',
            )}
          >
            {isWinner ? 'You Won!' : 'You Lost'}
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8">
            {isWinner
              ? 'You connected your nodes across the board!'
              : 'Your opponent connected their nodes first.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleLeave} variant="secondary" size="sm">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
