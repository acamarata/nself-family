# Development Guide

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker + Docker Compose
- Git

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> nself-family
cd nself-family
pnpm install

# 2. Start backend services (PostgreSQL, Hasura, MinIO)
cd backend
docker-compose up -d

# 3. Run migrations and seed data
pnpm db:migrate
pnpm db:seed

# 4. Start backend services
pnpm dev

# 5. Start frontend (in new terminal)
cd ../frontend
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Repository Structure

```
nself-family/
├── backend/           # ɳSelf-based backend (identity, auth, APIs, jobs)
│   ├── services/      # Backend services (auth, orchestrator, scheduler, jobs, stream-gateway)
│   ├── db/            # Database migrations, schemas, seeds
│   ├── hasura/        # Hasura metadata and migrations
│   ├── infra/         # Infrastructure (Docker, Terraform, Ansible)
│   └── scripts/       # Backend automation scripts
├── frontend/          # ɳFamily application (code once, deploy everywhere)
│   ├── src/           # Shared Next.js source
│   ├── platforms/     # Platform wrappers (desktop, mobile, TV, smart displays)
│   ├── variants/      # Platform-specific UI components
│   └── tests/         # Frontend tests
├── .github/           # GitHub Actions workflows
└── .wiki/             # Public documentation
```

## Development Workflow

### 1. Pick a Task

Check the current release milestone and open issues on GitHub to see what needs work.

### 2. Create a Branch

```bash
git checkout -b P1-T03-auth-plugin-skeleton
```

### 3. Implement

Follow AI Instructions in the task definition. Write tests as you go.

### 4. Test

```bash
# Backend tests
cd backend
pnpm test
pnpm test:coverage

# Frontend tests
cd frontend
pnpm test
pnpm test:coverage
```

### 5. Update Progress

Update the GitHub issue or PR with your progress.

### 6. Commit

```bash
git add -A
git commit -m "P1-T03: Auth plugin skeleton and error model"
```

### 7. Push (only at phase completion)

Code is NOT pushed until the entire phase is complete. After all tasks in a phase pass CR/QA:

```bash
git tag v0.N
git push origin main --tags
gh release create v0.N --title "v0.N — Phase Codename" --notes "..."
```

## Tech Stack

### Backend
- **Runtime:** Node.js 20+ (TypeScript)
- **Framework:** ɳSelf CLI + plugins
- **Database:** PostgreSQL 16
- **API:** Hasura GraphQL Engine
- **Storage:** MinIO (S3-compatible)
- **Jobs:** BullMQ + Redis
- **Auth:** JWT + refresh tokens

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State:** React Context / Zustand
- **Testing:** Vitest + React Testing Library
- **Desktop:** Tauri v2
- **Mobile:** Capacitor 6

## Commands

### Backend
```bash
pnpm dev              # Start all services in dev mode
pnpm build            # Build all services
pnpm test             # Run tests
pnpm test:coverage    # Run tests with coverage
pnpm db:migrate       # Run database migrations
pnpm db:rollback      # Rollback last migration
pnpm db:seed          # Seed database with demo data
pnpm db:reset         # Reset database (drop + migrate + seed)
pnpm lint             # Lint code
pnpm format           # Format code with Prettier
```

### Frontend
```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm test             # Run tests
pnpm test:coverage    # Run tests with coverage
pnpm lint             # Lint code
pnpm format           # Format code with Prettier
pnpm type-check       # Run TypeScript type checking
```

### Platform Builds
```bash
# Desktop (Tauri)
cd frontend/platforms/desktop
pnpm tauri dev        # Run desktop app in dev mode
pnpm tauri build      # Build desktop installer

# Mobile (Capacitor)
cd frontend/platforms/mobile
pnpm cap sync         # Sync web build to native projects
pnpm cap run ios      # Run on iOS simulator
pnpm cap run android  # Run on Android emulator
```

## Environment Variables

### Backend

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nself_family

# Hasura
HASURA_GRAPHQL_ADMIN_SECRET=your-secret-here

# Auth
JWT_SECRET=your-jwt-secret-here
JWT_ACCESS_EXPIRY=1800        # 30 minutes
JWT_REFRESH_EXPIRY=2592000    # 30 days

# Object Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=nself-family-dev

# Redis (for jobs)
REDIS_URL=redis://localhost:6379
```

### Frontend

Copy `.env.local.example` to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/v1/graphql
NEXT_PUBLIC_WS_URL=ws://localhost:8080/v1/graphql
```

## Code Quality

### TypeScript
- Strict mode enabled
- No `any` types allowed
- All public functions have JSDoc with `@param` and `@returns`

### Testing
- 100% coverage on all changed files
- Unit tests for all functions/hooks/components
- Integration tests for APIs and workflows
- E2E tests for critical user flows

### Linting
- ESLint with strict rules
- Prettier for formatting
- Pre-commit hooks enforce quality

## Troubleshooting

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart services
docker-compose restart postgres
```

### "Hasura connection failed"
```bash
# Check Hasura logs
docker-compose logs -f hasura

# Verify admin secret matches
echo $HASURA_GRAPHQL_ADMIN_SECRET
```

### "Port already in use"
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### "Tests failing on fresh checkout"
```bash
# Reset everything
cd backend
docker-compose down -v
docker-compose up -d
pnpm db:reset
pnpm test
```

## Getting Help

1. Read the wiki: `.wiki/Home.md`
2. Check release milestones on GitHub
3. Search issues: `gh issue list`
4. Ask in discussions: `gh discussion create`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
