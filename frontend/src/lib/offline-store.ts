/**
 * Offline store for caching data and managing offline state.
 * Provides read cache, draft saving, and sync queue.
 */

const CACHE_PREFIX = 'nfamily_cache_';
const DRAFT_PREFIX = 'nfamily_draft_';
const QUEUE_KEY = 'nfamily_sync_queue';

export interface OfflineAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
}

interface SyncResult {
  id: string;
  success: boolean;
  error?: string;
  conflicted?: boolean;
}

// ============================================================================
// Online status
// ============================================================================

/**
 * Check if the browser is currently online.
 * @returns True if online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// ============================================================================
// Read cache
// ============================================================================

/**
 * Get cached data for a key.
 * @param key - Cache key
 * @returns Cached data or null
 */
export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, expires_at } = JSON.parse(raw);
    if (expires_at && new Date(expires_at) < new Date()) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

/**
 * Set cached data with optional TTL.
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlMs - Time to live in milliseconds (default 1 hour)
 */
export function setCache<T>(key: string, data: T, ttlMs = 3600000): void {
  try {
    const expires_at = new Date(Date.now() + ttlMs).toISOString();
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, expires_at }));
  } catch {
    // Quota exceeded — silently fail
  }
}

/**
 * Clear a specific cache key.
 * @param key - Cache key to clear
 */
export function clearCacheKey(key: string): void {
  localStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Clear all cached data.
 */
export function clearAllCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// ============================================================================
// Draft storage
// ============================================================================

/**
 * Save a draft for offline editing.
 * @param draftType - Type of draft (post, message, recipe, etc.)
 * @param draftId - Unique draft identifier
 * @param content - Draft content
 */
export function saveDraft(draftType: string, draftId: string, content: Record<string, unknown>): void {
  try {
    const key = `${DRAFT_PREFIX}${draftType}_${draftId}`;
    localStorage.setItem(key, JSON.stringify({ content, saved_at: new Date().toISOString() }));
  } catch {
    // Silently fail
  }
}

/**
 * Get a saved draft.
 * @param draftType - Type of draft
 * @param draftId - Draft identifier
 * @returns Draft content or null
 */
export function getDraft(draftType: string, draftId: string): { content: Record<string, unknown>; saved_at: string } | null {
  try {
    const key = `${DRAFT_PREFIX}${draftType}_${draftId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Delete a draft.
 * @param draftType - Type of draft
 * @param draftId - Draft identifier
 */
export function deleteDraft(draftType: string, draftId: string): void {
  const key = `${DRAFT_PREFIX}${draftType}_${draftId}`;
  localStorage.removeItem(key);
}

/**
 * Get all drafts of a specific type.
 * @param draftType - Type of draft
 * @returns Array of drafts with their IDs
 */
export function getAllDrafts(draftType: string): Array<{ id: string; content: Record<string, unknown>; saved_at: string }> {
  const prefix = `${DRAFT_PREFIX}${draftType}_`;
  const drafts: Array<{ id: string; content: Record<string, unknown>; saved_at: string }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const { content, saved_at } = JSON.parse(localStorage.getItem(key)!);
        drafts.push({ id: key.slice(prefix.length), content, saved_at });
      } catch {
        // Skip corrupted entries
      }
    }
  }
  return drafts.sort((a, b) => b.saved_at.localeCompare(a.saved_at));
}

// ============================================================================
// Sync queue
// ============================================================================

/**
 * Get all actions in the sync queue.
 * @returns Array of queued actions
 */
export function getSyncQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Add an action to the sync queue.
 * @param type - Action type (create_post, send_message, rsvp, etc.)
 * @param payload - Action payload
 * @returns Queued action ID
 */
export function enqueueAction(type: string, payload: Record<string, unknown>): string {
  const queue = getSyncQueue();
  const id = crypto.randomUUID();
  queue.push({
    id,
    type,
    payload,
    created_at: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return id;
}

/**
 * Remove a completed action from the queue.
 * @param actionId - Action ID to remove
 */
export function dequeueAction(actionId: string): void {
  const queue = getSyncQueue().filter((a) => a.id !== actionId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Update action status in the queue.
 * @param actionId - Action ID
 * @param status - New status
 */
export function updateActionStatus(actionId: string, status: 'pending' | 'processing' | 'failed'): void {
  const queue = getSyncQueue();
  const action = queue.find((a) => a.id === actionId);
  if (action) {
    action.status = status;
    if (status === 'failed') action.retries++;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

/**
 * Get number of pending actions.
 * @returns Count of pending actions
 */
export function getPendingActionCount(): number {
  return getSyncQueue().filter((a) => a.status === 'pending').length;
}

/**
 * Clear the entire sync queue.
 */
export function clearSyncQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Process the sync queue — attempt to send each pending action.
 * @param processor - Function that processes each action
 * @returns Array of results
 */
export async function processQueue(
  processor: (action: OfflineAction) => Promise<{ success: boolean; conflicted?: boolean; error?: string }>,
): Promise<SyncResult[]> {
  const queue = getSyncQueue();
  const pending = queue.filter((a) => a.status === 'pending');
  const results: SyncResult[] = [];

  for (const action of pending) {
    updateActionStatus(action.id, 'processing');
    try {
      const result = await processor(action);
      if (result.success) {
        dequeueAction(action.id);
        results.push({ id: action.id, success: true });
      } else {
        updateActionStatus(action.id, 'failed');
        results.push({ id: action.id, success: false, error: result.error, conflicted: result.conflicted });
      }
    } catch (err) {
      updateActionStatus(action.id, 'failed');
      results.push({ id: action.id, success: false, error: String(err) });
    }
  }

  return results;
}
