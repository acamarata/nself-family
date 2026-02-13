import type { Pool } from 'pg';

interface CreateNotificationInput {
  family_id?: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  channel?: 'in_app' | 'push' | 'email';
  source_id?: string;
  source_type?: string;
}

/**
 * Create a notification event, with deduplication.
 * @param pool - Database pool
 * @param input - Notification data
 * @returns Created notification ID, or null if duplicate
 */
export async function createNotification(pool: Pool, input: CreateNotificationInput): Promise<string | null> {
  // Dedup: check if same notification exists in last 5 minutes
  if (input.source_id && input.source_type) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM public.notification_events
       WHERE user_id = $1 AND source_id = $2 AND source_type = $3 AND type = $4
         AND created_at > now() - interval '5 minutes'`,
      [input.user_id, input.source_id, input.source_type, input.type],
    );
    if (existing.length > 0) return null;
  }

  const { rows } = await pool.query(
    `INSERT INTO public.notification_events
      (family_id, user_id, type, title, body, data, channel, source_id, source_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      input.family_id ?? null, input.user_id, input.type, input.title,
      input.body ?? null, JSON.stringify(input.data ?? {}),
      input.channel ?? 'in_app', input.source_id ?? null, input.source_type ?? null,
    ],
  );
  return rows[0].id;
}

/**
 * Get unread notifications for a user.
 * @param pool - Database pool
 * @param userId - User ID
 * @param limit - Max results
 * @returns Notification events
 */
export async function getNotifications(
  pool: Pool,
  userId: string,
  limit = 50,
): Promise<Array<{
  id: string; type: string; title: string; body: string | null;
  data: Record<string, unknown>; status: string; created_at: string;
}>> {
  const { rows } = await pool.query(
    `SELECT id, type, title, body, data, status, created_at
     FROM public.notification_events
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows;
}

/**
 * Mark notifications as read.
 * @param pool - Database pool
 * @param userId - User ID
 * @param notificationIds - IDs to mark read
 * @returns Count of updated notifications
 */
export async function markNotificationsRead(pool: Pool, userId: string, notificationIds: string[]): Promise<number> {
  if (notificationIds.length === 0) return 0;
  const { rowCount } = await pool.query(
    `UPDATE public.notification_events SET status = 'read'
     WHERE user_id = $1 AND id = ANY($2) AND status != 'read'`,
    [userId, notificationIds],
  );
  return rowCount ?? 0;
}

/**
 * Get unread notification count for a user.
 * @param pool - Database pool
 * @param userId - User ID
 * @returns Unread count
 */
export async function getUnreadNotificationCount(pool: Pool, userId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM public.notification_events
     WHERE user_id = $1 AND status IN ('pending', 'sent', 'delivered')`,
    [userId],
  );
  return parseInt(rows[0].count, 10);
}

/**
 * Check if notification should be sent based on user preferences and quiet hours.
 * @param pool - Database pool
 * @param userId - User ID
 * @param notificationType - Notification type
 * @param channel - Notification channel
 * @returns True if notification should be sent
 */
export async function shouldSendNotification(
  pool: Pool,
  userId: string,
  notificationType: string,
  channel: 'in_app' | 'push' | 'email',
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT enabled, quiet_hours_start, quiet_hours_end
     FROM public.notification_preferences
     WHERE user_id = $1 AND notification_type = $2 AND channel = $3`,
    [userId, notificationType, channel],
  );

  // Default to enabled if no preference set
  if (rows.length === 0) return true;

  const pref = rows[0];
  if (!pref.enabled) return false;

  // Check quiet hours
  if (pref.quiet_hours_start && pref.quiet_hours_end) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = pref.quiet_hours_start;
    const end = pref.quiet_hours_end;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      if (currentTime >= start || currentTime < end) return false;
    } else {
      if (currentTime >= start && currentTime < end) return false;
    }
  }

  return true;
}

/**
 * Update notification preferences for a user.
 * @param pool - Database pool
 * @param userId - User ID
 * @param notificationType - Notification type
 * @param channel - Channel
 * @param enabled - Whether enabled
 * @param quietHoursStart - Quiet hours start (HH:MM)
 * @param quietHoursEnd - Quiet hours end (HH:MM)
 */
export async function updateNotificationPreference(
  pool: Pool,
  userId: string,
  notificationType: string,
  channel: 'in_app' | 'push' | 'email',
  enabled: boolean,
  quietHoursStart?: string,
  quietHoursEnd?: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO public.notification_preferences
      (user_id, notification_type, channel, enabled, quiet_hours_start, quiet_hours_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, notification_type, channel)
     DO UPDATE SET enabled = $4, quiet_hours_start = $5, quiet_hours_end = $6, updated_at = now()`,
    [userId, notificationType, channel, enabled, quietHoursStart ?? null, quietHoursEnd ?? null],
  );
}

/**
 * Register a push notification token.
 * @param pool - Database pool
 * @param userId - User ID
 * @param token - Push token
 * @param platform - Platform (fcm, apns, web)
 * @param deviceName - Optional device name
 * @returns Token ID
 */
export async function registerPushToken(
  pool: Pool,
  userId: string,
  token: string,
  platform: 'fcm' | 'apns' | 'web',
  deviceName?: string,
): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO public.push_tokens (user_id, token, platform, device_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, token) DO UPDATE SET is_active = true, platform = $3, device_name = $4, updated_at = now()
     RETURNING id`,
    [userId, token, platform, deviceName ?? null],
  );
  return rows[0].id;
}

/**
 * Set conversation notification override level.
 * @param pool - Database pool
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @param level - Override level
 */
export async function setConversationNotificationLevel(
  pool: Pool,
  conversationId: string,
  userId: string,
  level: 'all' | 'mentions_only' | 'muted',
): Promise<void> {
  await pool.query(
    `INSERT INTO public.conversation_notification_overrides (conversation_id, user_id, level)
     VALUES ($1, $2, $3)
     ON CONFLICT (conversation_id, user_id)
     DO UPDATE SET level = $3, updated_at = now()`,
    [conversationId, userId, level],
  );
}
