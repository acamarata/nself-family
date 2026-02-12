import Fastify from 'fastify';

/**
 * Creates and configures the jobs service Fastify instance
 * @returns Configured Fastify server instance
 */
export function createJobsServer() {
  const server = Fastify({
    logger: true,
  });

  /**
   * GET /health - Health check endpoint
   * Returns service health status
   */
  server.get('/health', async () => {
    return { status: 'ok', service: 'jobs' };
  });

  return server;
}

/**
 * Main entrypoint for the jobs service
 * Starts the Fastify server on port 3004
 */
async function main() {
  const server = createJobsServer();

  try {
    await server.listen({ port: 3004, host: '0.0.0.0' });
    console.log('Jobs service listening on port 3004');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
