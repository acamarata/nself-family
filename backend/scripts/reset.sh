#!/bin/bash
set -e

echo "🧹 Resetting nself-family development environment..."

# Navigate to repo root
cd "$(dirname "$0")/../.."

read -p "This will delete all data. Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled."
  exit 1
fi

# Stop and remove all containers
echo "🐳 Stopping Docker services..."
cd backend
docker-compose down -v

cd ..

# Clean up local data
echo "🗑️  Cleaning up local data..."
rm -rf backend/node_modules
rm -rf frontend/node_modules
rm -rf node_modules
rm -f backend/.env
rm -f frontend/.env.local

echo ""
echo "✅ Reset complete!"
echo ""
echo "Run ./backend/scripts/bootstrap.sh to set up again."
echo ""
