import { GraphQLClient } from 'graphql-request';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/v1/graphql';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001';

/**
 * Create a GraphQL client with optional auth token.
 * @param token - JWT access token
 * @returns Configured GraphQL client
 */
export function createGraphQLClient(token?: string): GraphQLClient {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return new GraphQLClient(GRAPHQL_URL, { headers });
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

/**
 * Typed fetch wrapper for the auth REST API.
 * @param path - API path (e.g., '/auth/login')
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function authFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${AUTH_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, error.error?.message ?? error.message ?? 'Request failed', error.error?.code);
  }

  return res.json();
}

/**
 * API error with status code and optional error code.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export { GRAPHQL_URL, AUTH_URL };
