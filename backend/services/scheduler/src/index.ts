import Fastify from 'fastify';

/**
 * Creates and configures the scheduler service Fastify instance
 * @returns Configured Fastify server instance
 */
export function createSchedulerServer() {
  const server = Fastify({
    logger: true,
  });

  /**
   * GET /health - Health check endpoint
   * Returns service health status
   */
  server.get('/health', async () => {
    return { status: 'ok', service: 'scheduler' };
  });

  return server;
}

/**
 * Main entrypoint for the scheduler service
 * Starts the Fastify server on port 3003
 */
async function main() {
  const server = createSchedulerServer();

  try {
    await server.listen({ port: 3003, host: '0.0.0.0' });
    console.log('Scheduler service listening on port 3003');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
