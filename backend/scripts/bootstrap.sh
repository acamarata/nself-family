#!/bin/bash
set -e

echo "🚀 Bootstrapping nself-family development environment..."

# Navigate to repo root
cd "$(dirname "$0")/../.."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required but not installed. Run: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start backend services
echo "🐳 Starting Docker services..."
cd backend
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Copy example env files if they don't exist
if [ ! -f .env ]; then
  echo "📝 Creating backend .env from .env.example..."
  cp .env.example .env
fi

cd ../frontend
if [ ! -f .env.local ]; then
  echo "📝 Creating frontend .env.local from .env.local.example..."
  cp .env.local.example .env.local
fi

cd ..

# Run migrations (will be available in Phase 1)
# echo "🗄️  Running database migrations..."
# cd backend && pnpm db:migrate

# Seed data (will be available in Phase 1)
# echo "🌱 Seeding database..."
# pnpm db:seed

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. cd backend && pnpm dev       # Start backend services"
echo "  2. cd frontend && pnpm dev      # Start frontend (in new terminal)"
echo "  3. Visit http://localhost:3000"
echo ""
echo "Services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Hasura Console: http://localhost:8080"
echo "  - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo "  - MailHog UI: http://localhost:8025"
echo ""
