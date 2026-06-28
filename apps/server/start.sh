#!/bin/sh
set -e

echo "🚀 Starting server..."

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Start the server
echo "✅ Server starting on port ${PORT:-3001}..."
exec node dist/index.js
