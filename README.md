# 🌐 Connectra

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-6.8-indigo?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**Connectra** is a browser-based, real-time multiplayer strategy board game. Built on a modern monorepo stack, it features seamless room code creation, instant matchmaking, and a responsive SVG-based game board with robust move validation and connection state management.

---

## 🎮 Game Rules & Objectives

The game is played on a dual-grid system consisting of **30 Black Circle nodes** and **30 Red Square nodes** arranged in an offset pattern.

- **Red Player** (Red Squares) moves first.
- **Black Player** (Black Circles) moves second.
- Players take turns drawing connections (edges) between adjacent nodes of their own color.
- Connections cannot cross existing paths (checked via line segment intersection algorithms).

### Win Conditions
- **Red wins** by forming a continuous connected path from the **leftmost column** to the **rightmost column**.
- **Black wins** by forming a continuous connected path from the **bottom row** to the **top row**.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, Zustand (state management), Socket.IO Client, Framer Motion (animations), React Query (data fetching).
- **Backend**: Node.js, Express, Socket.IO, Prisma ORM, TypeScript.
- **Database**: PostgreSQL (Prisma adapter).
- **Docker**: Containerized services with multi-stage production Dockerfiles and Nginx reverse proxy.
- **CI/CD**: GitHub Actions (Lint, Typecheck, and Docker Hub builds).

---

## 📂 Project Structure

This project is organized as a **pnpm workspace monorepo**:

```
connectra/
├── apps/
│   ├── client/          # React frontend (Vite)
│   │   ├── src/         # SVG board components, hooks, stores, context
│   │   └── nginx.conf   # Production Nginx server configuration
│   └── server/          # Express backend (Socket.io)
│       ├── prisma/      # PostgreSQL Schema and Migrations
│       └── src/         # GameEngine, Services, Socket handlers
├── packages/
│   └── shared/          # Shared interfaces, events, enums, & types
├── docker/              # Docker configuration files
├── scripts/             # Deployment & backup bash scripts
├── docker-compose.yml   # Dev compose stack (DB, Client, Server)
└── package.json         # Workspace root package configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` or higher
- **PostgreSQL**: `v16.x` or higher (or run via Docker Compose)

### Local Development

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Set Up Environment Variables**:
   Copy `.env.example` to `.env` and fill in your variables:
   ```bash
   cp .env.example .env
   ```

3. **Initialize Database**:
   If PostgreSQL is running locally, apply database schema:
   ```bash
   pnpm db:generate
   ```

   To push the schema and seed mock data:
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

4. **Run Development Server**:
   Start client, server, and shared package build-watcher concurrently:
   ```bash
   pnpm dev
   ```
   - Client is hosted at: `http://localhost:5173`
   - Server API is hosted at: `http://localhost:3001`

---

## 🐳 Docker Deployment (Development)

Run the entire application stack (Frontend, Backend, and PostgreSQL database) inside containerized environment:

```bash
# Start all containers in the background
pnpm docker:up

# View logs from all services
docker compose logs -f

# Shut down services and preserve data
pnpm docker:down
```

---

## 🛡️ Production Deployment

### Option 1: Docker Compose (Self-Hosted)
Generate production configurations and deploy using:
```bash
# Copy example prod env and customize secrets
cp .env.production.example .env.prod

# Run the deployment helper script
./scripts/deploy.sh
```

### Option 2: Cloud Services
- **Database**: Host on Supabase or AWS RDS and set `DATABASE_URL`.
- **Backend Server**: Deploy the server to Railway, Render, or Fly.io.
- **Frontend Client**: Deploy built `/apps/client/dist` static files directly to Vercel or Netlify.

---

## 📝 CLI Commands Reference

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Starts client and server concurrently in watch mode |
| `pnpm build` | Builds all packages (shared, client, server) for production |
| `pnpm lint` | Runs ESLint rules checking across the monorepo |
| `pnpm format` | Formats all source files using Prettier |
| `pnpm typecheck` | Validates TypeScript compilation without emitting files |
| `pnpm db:generate` | Generates Prisma client database adapters |
| `pnpm db:push` | Syncs local schema draft state to target Postgres DB |
| `pnpm db:studio` | Launches Prisma database console browser GUI |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
