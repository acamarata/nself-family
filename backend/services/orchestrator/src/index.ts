import Fastify from 'fastify';

/**
 * Creates and configures the orchestrator service Fastify instance
 * @returns Configured Fastify server instance
 */
export function createOrchestratorServer() {
  const server = Fastify({
    logger: true,
  });

  /**
   * GET /health - Health check endpoint
   * Returns service health status
   */
  server.get('/health', async () => {
    return { status: 'ok', service: 'orchestrator' };
  });

  return server;
}

/**
 * Main entrypoint for the orchestrator service
 * Starts the Fastify server on port 3002
 */
async function main() {
  const server = createOrchestratorServer();

  try {
    await server.listen({ port: 3002, host: '0.0.0.0' });
    console.log('Orchestrator service listening on port 3002');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
