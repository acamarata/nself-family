# backend/scripts

Automation scripts for backend development tasks.

## Available Scripts

### `bootstrap.sh`

One-command setup for new contributors or fresh environments.

```bash
cd backend
./scripts/bootstrap.sh
```

What it does:
1. Checks prerequisites (Node.js, pnpm, Docker)
2. Installs dependencies (backend + frontend)
3. Starts Docker services (PostgreSQL, Hasura, MinIO, Redis, MailHog)
4. Creates `.env` files from examples
5. Runs migrations and seeds (when available)

### `reset.sh`

Reset the development environment to clean state.

```bash
cd backend
./scripts/reset.sh
```

What it does:
1. Stops and removes all Docker containers and volumes
2. Removes `node_modules` (backend + frontend)
3. Removes `.env` files

**Warning:** This deletes all local data. Use with caution.

## Making Scripts Executable

```bash
chmod +x backend/scripts/*.sh
```

## CI/CD Scripts

CI/CD workflow scripts live in `.github/workflows/`. These scripts are for local development only.
