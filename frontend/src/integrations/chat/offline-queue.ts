/**
 * Offline message queue with localStorage persistence.
 * Queues messages when offline and syncs on reconnect.
 */

interface QueuedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  reply_to_id?: string;
  shared_content?: Record<string, unknown>;
  queued_at: string;
  status: 'pending' | 'sending' | 'failed';
}

const STORAGE_KEY = 'nfamily_offline_queue';

/**
 * Get all queued messages from localStorage.
 * @returns Array of queued messages
 */
export function getQueuedMessages(): QueuedMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Add a message to the offline queue.
 * @param message - Message to queue
 */
export function enqueueMessage(message: Omit<QueuedMessage, 'id' | 'queued_at' | 'status'>): void {
  const queued: QueuedMessage = {
    ...message,
    id: crypto.randomUUID(),
    queued_at: new Date().toISOString(),
    status: 'pending',
  };
  const queue = getQueuedMessages();
  queue.push(queued);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Remove a message from the queue (after successful send).
 * @param id - Queued message ID
 */
export function dequeueMessage(id: string): void {
  const queue = getQueuedMessages().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Update the status of a queued message.
 * @param id - Queued message ID
 * @param status - New status
 */
export function updateQueueStatus(id: string, status: QueuedMessage['status']): void {
  const queue = getQueuedMessages().map((m) =>
    m.id === id ? { ...m, status } : m,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Clear the entire offline queue.
 */
export function clearQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get count of pending messages in queue.
 * @returns Number of pending messages
 */
export function getPendingCount(): number {
  return getQueuedMessages().filter((m) => m.status === 'pending').length;
}

/**
 * Check if the browser is online.
 * @returns True if online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
