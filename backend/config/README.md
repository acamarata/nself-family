# Backend Configuration

## Configuration Loading Pattern

All backend services follow a consistent configuration loading pattern using environment variables and Zod schema validation.

### Principles

1. **Environment-first**: All configuration comes from environment variables
2. **Schema validation**: Use Zod to validate config at startup
3. **Fail-fast**: Invalid configuration causes immediate process exit
4. **Type-safe**: TypeScript types generated from Zod schemas
5. **No secrets in code**: All sensitive data via environment variables

### Usage Pattern

Each service should define its configuration schema:

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  database: z.object({
    url: z.string().url(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  try {
    return ConfigSchema.parse({
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      database: {
        url: process.env.DATABASE_URL,
      },
    });
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}
```

### Environment Variables

See `backend/.env.example` for all available configuration options.

### Service Ports

- Auth: 3001
- Orchestrator: 3002
- Scheduler: 3003
- Jobs: 3004
- Stream Gateway: 3005

### Module Boundaries

Each service exports:
- Configuration schema (Zod)
- Configuration type (TypeScript)
- Configuration loader function
- Server factory function
- Main entrypoint

Services must not directly import from other services. Communication happens via HTTP/gRPC APIs only.
