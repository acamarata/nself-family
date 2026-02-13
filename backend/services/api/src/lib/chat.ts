import type { Pool } from 'pg';

interface CreateConversationInput {
  family_id: string;
  type: 'direct' | 'group';
  title?: string;
  created_by: string;
  member_ids: string[];
}

interface SendMessageInput {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  reply_to_id?: string;
  media_id?: string;
  shared_content?: Record<string, unknown>;
  mentions?: string[];
}

/**
 * Create a conversation with initial members.
 * @param pool - Database pool
 * @param input - Conversation data
 * @returns Created conversation ID
 */
export async function createConversation(pool: Pool, input: CreateConversationInput): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO public.conversations (family_id, type, title, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [input.family_id, input.type, input.title ?? null, input.created_by],
    );
    const conversationId = rows[0].id;

    // Add creator as admin
    await client.query(
      `INSERT INTO public.conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [conversationId, input.created_by],
    );

    // Add other members
    for (const memberId of input.member_ids) {
      if (memberId !== input.created_by) {
        await client.query(
          `INSERT INTO public.conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'member')`,
          [conversationId, memberId],
        );
      }
    }

    await client.query('COMMIT');
    return conversationId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Send a message in a conversation.
 * @param pool - Database pool
 * @param input - Message data
 * @returns Created message ID
 */
export async function sendMessage(pool: Pool, input: SendMessageInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO public.messages
      (conversation_id, sender_id, content, message_type, reply_to_id, media_id, shared_content)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, created_at`,
    [
      input.conversation_id, input.sender_id, input.content,
      input.message_type ?? 'text', input.reply_to_id ?? null,
      input.media_id ?? null, input.shared_content ? JSON.stringify(input.shared_content) : null,
    ],
  );

  const messageId = rows[0].id;

  // Insert mentions
  if (input.mentions?.length) {
    for (const userId of input.mentions) {
      await pool.query(
        `INSERT INTO public.message_mentions (message_id, mentioned_user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [messageId, userId],
      );
    }
  }

  return messageId;
}

/**
 * Edit a message's content.
 * @param pool - Database pool
 * @param messageId - Message ID
 * @param senderId - Must be the original sender
 * @param newContent - Updated content
 * @returns True if updated
 */
export async function editMessage(pool: Pool, messageId: string, senderId: string, newContent: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE public.messages SET content = $1, edited_at = now()
     WHERE id = $2 AND sender_id = $3 AND deleted_at IS NULL`,
    [newContent, messageId, senderId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Soft-delete a message.
 * @param pool - Database pool
 * @param messageId - Message ID
 * @param userId - User requesting deletion (must be sender or admin)
 * @returns True if deleted
 */
export async function deleteMessage(pool: Pool, messageId: string, userId: string): Promise<boolean> {
  // Allow sender to delete their own message
  const { rowCount } = await pool.query(
    `UPDATE public.messages SET deleted_at = now(), content = NULL
     WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL`,
    [messageId, userId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Add a reaction to a message.
 * @param pool - Database pool
 * @param messageId - Message ID
 * @param userId - User reacting
 * @param emoji - Emoji reaction
 * @returns Created reaction ID
 */
export async function addReaction(pool: Pool, messageId: string, userId: string, emoji: string): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO public.message_reactions (message_id, user_id, emoji)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id, user_id, emoji) DO NOTHING
     RETURNING id`,
    [messageId, userId, emoji],
  );
  return rows[0]?.id ?? '';
}

/**
 * Remove a reaction from a message.
 * @param pool - Database pool
 * @param messageId - Message ID
 * @param userId - User removing reaction
 * @param emoji - Emoji to remove
 * @returns True if removed
 */
export async function removeReaction(pool: Pool, messageId: string, userId: string, emoji: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM public.message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [messageId, userId, emoji],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Update read state for a user in a conversation.
 * @param pool - Database pool
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @param lastReadMessageId - Last read message ID
 */
export async function updateReadState(
  pool: Pool,
  conversationId: string,
  userId: string,
  lastReadMessageId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO public.read_states (conversation_id, user_id, last_read_message_id, last_read_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (conversation_id, user_id)
     DO UPDATE SET last_read_message_id = $3, last_read_at = now()`,
    [conversationId, userId, lastReadMessageId],
  );
}

/**
 * Get unread message count for a user in a conversation.
 * @param pool - Database pool
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @returns Unread count
 */
export async function getUnreadCount(pool: Pool, conversationId: string, userId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM public.messages m
     WHERE m.conversation_id = $1
       AND m.sender_id != $2
       AND m.deleted_at IS NULL
       AND m.created_at > COALESCE(
         (SELECT last_read_at FROM public.read_states WHERE conversation_id = $1 AND user_id = $2),
         '1970-01-01'
       )`,
    [conversationId, userId],
  );
  return parseInt(rows[0].count, 10);
}

/**
 * Search messages in conversations the user is a member of.
 * @param pool - Database pool
 * @param userId - Searching user
 * @param query - Search query
 * @param conversationId - Optional: limit to specific conversation
 * @returns Matching messages
 */
export async function searchMessages(
  pool: Pool,
  userId: string,
  query: string,
  conversationId?: string,
): Promise<Array<{ id: string; conversation_id: string; content: string; sender_id: string; created_at: string }>> {
  const params: unknown[] = [userId, `%${query}%`];
  let sql = `
    SELECT m.id, m.conversation_id, m.content, m.sender_id, m.created_at
    FROM public.messages m
    JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = $1
    WHERE m.content ILIKE $2 AND m.deleted_at IS NULL
  `;
  if (conversationId) {
    params.push(conversationId);
    sql += ` AND m.conversation_id = $${params.length}`;
  }
  sql += ' ORDER BY m.created_at DESC LIMIT 50';
  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * Admin: delete any message in a family conversation.
 * @param pool - Database pool
 * @param messageId - Message ID
 * @param adminId - Admin performing the action (for audit)
 * @returns True if deleted
 */
export async function adminDeleteMessage(pool: Pool, messageId: string, adminId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE public.messages SET deleted_at = now(), content = NULL,
            metadata = jsonb_set(COALESCE(metadata, '{}'), '{deleted_by}', to_jsonb($2::text))
     WHERE id = $1 AND deleted_at IS NULL`,
    [messageId, adminId],
  );
  return (rowCount ?? 0) > 0;
}
