#!/bin/bash
set -e

# ─────────────────────────────────────────────
# Production Deployment Script
# ─────────────────────────────────────────────

echo "🚀 Connectra - Production Deployment"
echo "======================================"

# Check required environment variables
required_vars=("DOMAIN" "POSTGRES_PASSWORD" "JWT_SECRET")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set"
    echo "Please set the following environment variables:"
    echo "  export DOMAIN=yourdomain.com"
    echo "  export POSTGRES_PASSWORD=your-secure-password"
    echo "  export JWT_SECRET=your-jwt-secret"
    exit 1
  fi
done

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
  echo "⚠️  .env.prod not found. Creating from template..."
  cat > .env.prod << EOF
# Production Environment Variables
DOMAIN=${DOMAIN}
POSTGRES_USER=brain_game
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=brain_game
JWT_SECRET=${JWT_SECRET}
RECONNECT_TOKEN_TTL_MINUTES=1
EOF
  echo "✅ Created .env.prod"
fi

echo ""
echo "📋 Deployment Configuration:"
echo "  Domain: ${DOMAIN}"
echo "  Database: PostgreSQL"
echo "  SSL: Let's Encrypt"
echo ""

# Build and start services
echo "🔨 Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo ""
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo "🏥 Checking service health..."
if curl -sf "http://localhost/api/health" > /dev/null 2>&1; then
  echo "✅ Server is healthy"
else
  echo "⚠️  Server health check failed (may still be starting)"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "📝 Useful Commands:"
echo "  View logs:     docker compose -f docker-compose.prod.yml logs -f"
echo "  Stop services: docker compose -f docker-compose.prod.yml down"
echo "  Restart:       docker compose -f docker-compose.prod.yml restart"
echo "  Backup DB:     ./scripts/backup-db.sh"
