import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Supported API versions.
 */
export const API_VERSIONS = ['v1', 'v2'] as const;
export type ApiVersion = (typeof API_VERSIONS)[number];

export const CURRENT_API_VERSION: ApiVersion = 'v1';
export const DEPRECATED_VERSIONS: ApiVersion[] = [];

/**
 * API version metadata.
 */
export interface VersionInfo {
  version: ApiVersion;
  status: 'current' | 'supported' | 'deprecated';
  sunset_date?: string;
}

/**
 * Get information about all API versions.
 * @returns Array of version metadata
 */
export function getVersions(): VersionInfo[] {
  return API_VERSIONS.map((v) => ({
    version: v,
    status: v === CURRENT_API_VERSION
      ? 'current'
      : DEPRECATED_VERSIONS.includes(v)
        ? 'deprecated'
        : 'supported',
    sunset_date: DEPRECATED_VERSIONS.includes(v)
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : undefined,
  }));
}

/**
 * Extract API version from request path or header.
 * @param request - Fastify request
 * @returns Resolved API version
 */
export function resolveVersion(request: FastifyRequest): ApiVersion {
  // Check URL path: /v1/endpoint, /v2/endpoint
  const pathMatch = request.url.match(/^\/(v\d+)\//);
  if (pathMatch && API_VERSIONS.includes(pathMatch[1] as ApiVersion)) {
    return pathMatch[1] as ApiVersion;
  }

  // Check Accept header: application/vnd.nself.v1+json
  const accept = request.headers.accept || '';
  const headerMatch = accept.match(/application\/vnd\.nself\.(v\d+)\+json/);
  if (headerMatch && API_VERSIONS.includes(headerMatch[1] as ApiVersion)) {
    return headerMatch[1] as ApiVersion;
  }

  // Check custom header: X-API-Version: v1
  const customHeader = request.headers['x-api-version'] as string | undefined;
  if (customHeader && API_VERSIONS.includes(customHeader as ApiVersion)) {
    return customHeader as ApiVersion;
  }

  return CURRENT_API_VERSION;
}

/**
 * Check if a version is deprecated.
 * @param version - API version
 * @returns True if deprecated
 */
export function isDeprecated(version: ApiVersion): boolean {
  return DEPRECATED_VERSIONS.includes(version);
}

/**
 * Validate that a version string is supported.
 * @param version - Version string to validate
 * @returns True if valid and supported
 */
export function isValidVersion(version: string): version is ApiVersion {
  return API_VERSIONS.includes(version as ApiVersion);
}

/**
 * API version response transformer — adds version metadata to responses.
 * @param version - Current request API version
 * @param data - Response data
 * @returns Data with version metadata
 */
export function wrapResponse<T>(version: ApiVersion, data: T): { api_version: ApiVersion; data: T; deprecated?: boolean } {
  const result: { api_version: ApiVersion; data: T; deprecated?: boolean } = {
    api_version: version,
    data,
  };

  if (isDeprecated(version)) {
    result.deprecated = true;
  }

  return result;
}

/**
 * Register API versioning middleware on a Fastify instance.
 * Sets X-API-Version response header and adds deprecation warnings.
 * @param app - Fastify instance
 */
export function registerVersioningMiddleware(app: FastifyInstance): void {
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    const version = resolveVersion(request);
    reply.header('X-API-Version', version);

    if (isDeprecated(version)) {
      reply.header('Deprecation', 'true');
      reply.header('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());
      reply.header('Link', `</api/${CURRENT_API_VERSION}>; rel="successor-version"`);
    }
  });
}

/**
 * Generate OpenAPI-compatible endpoint definitions for SDK generation.
 * @returns Endpoint definitions grouped by version
 */
export function generateEndpointCatalog(): Record<ApiVersion, Array<{ method: string; path: string; description: string }>> {
  const v1Endpoints = [
    { method: 'POST', path: '/auth/register', description: 'Register a new user' },
    { method: 'POST', path: '/auth/login', description: 'Authenticate and receive tokens' },
    { method: 'POST', path: '/auth/refresh', description: 'Refresh access token' },
    { method: 'POST', path: '/auth/revoke', description: 'Revoke refresh token' },
    { method: 'POST', path: '/auth/logout', description: 'End session' },
    { method: 'GET', path: '/auth/me', description: 'Get current user profile' },
    { method: 'GET', path: '/health', description: 'Service health check' },
    { method: 'GET', path: '/ready', description: 'Service readiness check' },
    { method: 'POST', path: '/media/upload', description: 'Upload media file' },
    { method: 'POST', path: '/audit/events', description: 'Query audit events' },
    { method: 'GET', path: '/api/versions', description: 'List API versions' },
  ];

  return {
    v1: v1Endpoints,
    v2: [
      ...v1Endpoints,
      { method: 'POST', path: '/auth/register', description: 'Register with enhanced validation' },
    ],
  };
}

/**
 * Generate a TypeScript SDK type definition string from endpoint catalog.
 * @returns TypeScript type definition as string
 */
export function generateSDKTypes(): string {
  const catalog = generateEndpointCatalog();
  let output = '// Auto-generated TypeScript SDK types for nFamily API\n';
  output += '// Do not edit manually — regenerate with: nself sdk generate\n\n';

  for (const [version, endpoints] of Object.entries(catalog)) {
    output += `export interface ${version.toUpperCase()}Client {\n`;
    for (const endpoint of endpoints) {
      const methodName = endpoint.path.replace(/^\//, '').replace(/\//g, '_').replace(/-/g, '_');
      output += `  /** ${endpoint.description} */\n`;
      output += `  ${endpoint.method.toLowerCase()}_${methodName}(params?: Record<string, unknown>): Promise<unknown>;\n`;
    }
    output += '}\n\n';
  }

  return output;
}
