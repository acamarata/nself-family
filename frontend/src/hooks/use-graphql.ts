import { useCallback, useMemo } from 'react';
import { GraphQLClient } from 'graphql-request';
import { useAuthStore } from '@/lib/auth-store';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/v1/graphql';

/**
 * Hook that returns a GraphQL client with the current access token.
 * @returns Authenticated GraphQL client
 */
export function useGraphQLClient(): GraphQLClient {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useMemo(() => {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return new GraphQLClient(GRAPHQL_URL, { headers });
  }, [accessToken]);
}

/**
 * Hook that returns a function to execute GraphQL queries with auth.
 * @returns Async function to execute queries
 */
export function useGraphQL() {
  const client = useGraphQLClient();

  const execute = useCallback(
    async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
      return client.request<T>(query, variables);
    },
    [client],
  );

  return { execute, client };
}
