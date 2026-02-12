import Fastify from 'fastify';

/**
 * Creates and configures the stream-gateway service Fastify instance
 * @returns Configured Fastify server instance
 */
export function createStreamGatewayServer() {
  const server = Fastify({
    logger: true,
  });

  /**
   * GET /health - Health check endpoint
   * Returns service health status
   */
  server.get('/health', async () => {
    return { status: 'ok', service: 'stream-gateway' };
  });

  return server;
}

/**
 * Main entrypoint for the stream-gateway service
 * Starts the Fastify server on port 3005
 */
async function main() {
  const server = createStreamGatewayServer();

  try {
    await server.listen({ port: 3005, host: '0.0.0.0' });
    console.log('Stream Gateway service listening on port 3005');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
