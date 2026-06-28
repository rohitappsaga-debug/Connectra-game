#!/bin/bash
set -e

# ─────────────────────────────────────────────
# Database Backup Script
# ─────────────────────────────────────────────

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/brain_game_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "📦 Database Backup"
echo "=================="

# Check if running in Docker
if docker compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
  echo "📋 Backing up database from Docker container..."
  docker compose -f docker-compose.prod.yml exec -T db pg_dump -U brain_game brain_game | gzip > "${BACKUP_FILE}"
else
  echo "📋 Backing up local database..."
  pg_dump -U brain_game brain_game | gzip > "${BACKUP_FILE}"
fi

# Check backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo ""
echo "✅ Backup complete!"
echo "  File: ${BACKUP_FILE}"
echo "  Size: ${BACKUP_SIZE}"

# Clean up old backups (keep last 7 days)
echo ""
echo "🧹 Cleaning up old backups..."
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete
echo "✅ Old backups cleaned"

# List remaining backups
echo ""
echo "📁 Current backups:"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null || echo "  No backups found"
