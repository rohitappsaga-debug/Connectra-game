# Connectra

A browser-based multiplayer strategy board game built with React, Express, PostgreSQL, and Socket.IO.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS, Framer Motion |
| Backend | Express, Socket.IO, Prisma ORM |
| Database | PostgreSQL 16 |
| Infrastructure | Docker, NGINX, GitHub Actions |

## Project Structure

```
connectra/
├── apps/
│   ├── client/          # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── game/      # SVGBoard, BoardContainer, TurnIndicator
│   │   │   │   ├── layout/    # Header
│   │   │   │   └── ui/        # Button, PlayerCard, RoomCode, Badge, ConnectionStatus
│   │   │   ├── context/       # SocketProvider
│   │   │   ├── hooks/         # useSocketActions
│   │   │   ├── pages/         # Home, Room, NotFound
│   │   │   └── stores/        # game-store, room-store, ui-store (Zustand)
│   │   └── nginx.prod.conf    # Production NGINX config
│   └── server/          # Express backend
│       ├── prisma/      # Database schema
│       └── src/
│           ├── engine/          # GameEngine (board gen, validation, win detection)
│           ├── repositories/    # Database access layer
│           ├── services/        # Business logic (game, room, reconnect)
│           ├── sockets/         # Socket.IO event handlers
│           ├── validation/      # Zod schemas
│           └── middleware/      # Error, auth, logging, security
└── packages/
    └── shared/          # Shared types, events, enums
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+

### Local Development

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your database URL

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:push

# Start development servers
pnpm dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

### Docker Development

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

## Production Deployment

### Option 1: Railway + Supabase

1. **Supabase** (Database):
   - Create project at [supabase.com](https://supabase.com)
   - Run migrations: `supabase db push`

2. **Railway** (Server):
   - Create service at [railway.app](https://railway.app)
   - Connect GitHub repo
   - Set environment variables

3. **Vercel** (Client):
   - Deploy frontend at [vercel.com](https://vercel.com)

### Option 2: Docker (Self-Hosted)

```bash
# Create production environment
cp .env.example .env.prod
# Edit .env.prod with your secrets

# Deploy
./scripts/deploy.sh
```

### Option 3: Docker + Let's Encrypt

```bash
# Set environment variables
export DOMAIN=yourdomain.com
export POSTGRES_PASSWORD=your-secure-password
export JWT_SECRET=your-jwt-secret

# Deploy with SSL
docker compose -f docker-compose.prod.yml up -d
```

## Game Rules

### Board

- 30 black circle nodes (5×6 grid)
- 30 red square nodes (5×6 grid, offset by half spacing)
- 540 possible edges (adjacent connections)

### Gameplay

- **Red** moves first (circles/squares)
- **Black** moves second
- Players take turns drawing edges between adjacent nodes of their color

### Win Conditions

- **Red wins**: Creates a path from left column to right column
- **Black wins**: Creates a path from bottom row to top row

### Move Validation

1. Game must not be over
2. Correct player's turn
3. Both nodes must exist on board
4. Nodes must not be owned by opponent
5. Cannot connect a node to itself
6. Nodes must be adjacent
7. Edge must not already exist
8. Edge must not cross existing edges (checked via segment intersection)

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create a new room |
| POST | `/api/rooms/:id/join` | Join an existing room |
| GET | `/api/rooms/:id` | Get room details |
| GET | `/api/health` | Health check |

### Socket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `PLAYER_MOVE` | Client→Server | `{ fromNodeId, toNodeId }` | Submit a move |
| `PLAYER_RECONNECT` | Client→Server | `{ token }` | Reconnect to game |
| `MOVE_PLAYED` | Server→Client | `MoveData` | Move was accepted |
| `TURN_CHANGED` | Server→Client | `{ gameId, turn, currentPlayerId }` | Turn updated |
| `GAME_FINISHED` | Server→Client | `WinCondition` | Game ended |
| `GAME_ERROR` | Server→Client | `{ message }` | Error occurred |

## Development Commands

```bash
# Root level
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
pnpm typecheck        # Type check all packages

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio

# Docker
pnpm docker:up        # Start Docker services
pnpm docker:down      # Stop Docker services
pnpm docker:build     # Build Docker images
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `PORT` | No | `3001` | Server port |
| `NODE_ENV` | No | `development` | Environment |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed origins |
| `JWT_SECRET` | Yes | - | Secret for JWT signing |
| `RECONNECT_TOKEN_TTL_MINUTES` | No | `1` | Reconnect token expiry |
| `VITE_API_URL` | Yes | - | Backend API URL |
| `VITE_WS_URL` | Yes | - | WebSocket URL |

## License

MIT
