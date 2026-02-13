/**
 * Deep-link generation and parsing for TV content handoff.
 */

export interface DeepLink {
  scheme: string;
  action: string;
  content_id?: string;
  family_id: string;
  user_id: string;
  entitlements?: string[];
  timestamp: string;
  expires_at: string;
}

const DEEP_LINK_SCHEME = 'nself-tv';
const DEEP_LINK_TTL_MS = 300_000; // 5 minutes

/**
 * Generate a deep-link URL for TV content.
 * @param params - Deep-link parameters
 * @returns Deep-link URL string
 */
export function generateDeepLink(params: {
  action: string;
  content_id?: string;
  family_id: string;
  user_id: string;
  entitlements?: string[];
}): string {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEEP_LINK_TTL_MS);

  const query = new URLSearchParams({
    action: params.action,
    family_id: params.family_id,
    user_id: params.user_id,
    timestamp: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (params.content_id) query.set('content_id', params.content_id);
  if (params.entitlements?.length) query.set('entitlements', params.entitlements.join(','));

  return `${DEEP_LINK_SCHEME}://handoff?${query.toString()}`;
}

/**
 * Parse a deep-link URL.
 * @param url - Deep-link URL string
 * @returns Parsed deep-link or null if invalid/expired
 */
export function parseDeepLink(url: string): DeepLink | null {
  try {
    if (!url.startsWith(`${DEEP_LINK_SCHEME}://`)) return null;

    const queryString = url.split('?')[1];
    if (!queryString) return null;

    const params = new URLSearchParams(queryString);
    const expiresAt = params.get('expires_at');

    // Check expiry
    if (expiresAt && new Date(expiresAt) < new Date()) return null;

    const action = params.get('action');
    const familyId = params.get('family_id');
    const userId = params.get('user_id');

    if (!action || !familyId || !userId) return null;

    return {
      scheme: DEEP_LINK_SCHEME,
      action,
      content_id: params.get('content_id') ?? undefined,
      family_id: familyId,
      user_id: userId,
      entitlements: params.get('entitlements')?.split(',').filter(Boolean),
      timestamp: params.get('timestamp') ?? new Date().toISOString(),
      expires_at: expiresAt ?? new Date(Date.now() + DEEP_LINK_TTL_MS).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Check if a deep-link is still valid (not expired/revoked).
 * @param link - Parsed deep-link
 * @returns True if valid
 */
export function isDeepLinkValid(link: DeepLink): boolean {
  return new Date(link.expires_at) > new Date();
}
