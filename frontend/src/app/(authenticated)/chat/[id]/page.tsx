'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useMessages, useSendMessage, useEditMessage, useDeleteMessage,
  useAddReaction, useRemoveReaction, useUpdateReadState,
} from '@/integrations/chat';
import { useAuthStore } from '@/lib/auth-store';
import type { Message, MessageReaction } from '@/types';
import Link from 'next/link';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

type MessageWithReactions = Message & { message_reactions: MessageReaction[] };

/**
 * Conversation detail page with message thread.
 */
export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading, hasNextPage, fetchNextPage } = useMessages(id);
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMsg = useDeleteMessage();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const updateReadState = useUpdateReadState();

  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const messages = data?.pages.flatMap((p) => p.messages) ?? [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark as read when viewing
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && userId) {
      updateReadState.mutate({ conversationId: id, userId, lastReadMessageId: lastMsg.id });
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !content.trim()) return;

    await sendMessage.mutateAsync({
      conversation_id: id,
      sender_id: userId,
      content: content.trim(),
      reply_to_id: replyTo?.id,
    });
    setContent('');
    setReplyTo(null);
    setIsTyping(false);
  }, [userId, content, id, replyTo, sendMessage]);

  function handleTyping() {
    if (!isTyping) setIsTyping(true);
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => setIsTyping(false), 3000));
  }

  async function handleEdit(msgId: string) {
    if (!editContent.trim()) return;
    await editMessage.mutateAsync({ id: msgId, content: editContent.trim() });
    setEditingId(null);
    setEditContent('');
  }

  function handleReaction(messageId: string, emoji: string) {
    if (!userId) return;
    const msg = messages.find((m) => m.id === messageId) as MessageWithReactions | undefined;
    const existing = msg?.message_reactions?.find((r) => r.user_id === userId && r.emoji === emoji);
    if (existing) {
      removeReaction.mutate({ messageId, userId, emoji });
    } else {
      addReaction.mutate({ messageId, userId, emoji });
    }
    setShowReactions(null);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col pb-20 sm:pl-56" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <button type="button" onClick={() => router.push('/chat')} className="text-sm text-blue-600 hover:text-blue-700" aria-label="Back to conversations">
          &larr; Back
        </button>
        <h1 className="flex-1 text-lg font-bold">Conversation</h1>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        {hasNextPage && (
          <div className="mb-4 text-center">
            <button type="button" onClick={() => fetchNextPage()} className="text-sm text-blue-600 hover:text-blue-700">
              Load older messages
            </button>
          </div>
        )}

        {isLoading && <p className="text-center text-sm text-slate-500">Loading messages...</p>}

        <div className="space-y-3">
          {messages.map((msg) => {
            const isMine = msg.sender_id === userId;
            const isDeleted = !!msg.deleted_at;
            const msgWithReactions = msg as MessageWithReactions;

            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMine ? 'order-last' : ''}`}>
                  {/* Sender name (not for own messages) */}
                  {!isMine && (
                    <div className="mb-0.5 text-xs text-slate-400">
                      {msg.sender?.display_name ?? 'User'}
                    </div>
                  )}

                  {/* Reply indicator */}
                  {msg.reply_to_id && (
                    <div className="mb-1 rounded border-l-2 border-blue-400 bg-slate-50 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800">
                      Reply to a message
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`group relative rounded-lg px-3 py-2 ${
                      isDeleted
                        ? 'bg-slate-100 italic text-slate-400 dark:bg-slate-800'
                        : isMine
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {editingId === msg.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleEdit(msg.id); }} className="flex gap-1">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="flex-1 rounded bg-white px-2 py-1 text-sm text-slate-800"
                          autoFocus
                          aria-label="Edit message"
                        />
                        <button type="submit" className="text-xs text-blue-600">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs text-slate-400">Cancel</button>
                      </form>
                    ) : (
                      <>
                        <p className="text-sm">
                          {isDeleted ? 'This message was deleted' : msg.content}
                        </p>

                        {/* Shared content card */}
                        {msg.shared_content && !isDeleted && (
                          <div className="mt-1 rounded border border-slate-200 bg-white p-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            <div className="font-medium">{(msg.shared_content as Record<string, unknown>).title as string ?? 'Shared content'}</div>
                            <div className="text-slate-400">{(msg.shared_content as Record<string, unknown>).type as string ?? ''}</div>
                          </div>
                        )}

                        {msg.edited_at && !isDeleted && (
                          <span className="text-[10px] opacity-60">(edited)</span>
                        )}
                      </>
                    )}

                    {/* Message actions */}
                    {!isDeleted && editingId !== msg.id && (
                      <div className="absolute -top-6 right-0 hidden gap-1 group-hover:flex">
                        <button type="button" onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)} className="rounded bg-white px-1 py-0.5 text-xs shadow dark:bg-slate-700" aria-label="React">😊</button>
                        <button type="button" onClick={() => setReplyTo(msg)} className="rounded bg-white px-1 py-0.5 text-xs shadow dark:bg-slate-700" aria-label="Reply">↩</button>
                        {isMine && (
                          <>
                            <button type="button" onClick={() => { setEditingId(msg.id); setEditContent(msg.content ?? ''); }} className="rounded bg-white px-1 py-0.5 text-xs shadow dark:bg-slate-700" aria-label="Edit">✏️</button>
                            <button type="button" onClick={() => deleteMsg.mutate(msg.id)} className="rounded bg-white px-1 py-0.5 text-xs text-red-500 shadow dark:bg-slate-700" aria-label="Delete">🗑</button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Reaction picker */}
                    {showReactions === msg.id && (
                      <div className="absolute -top-8 left-0 flex gap-1 rounded bg-white p-1 shadow-lg dark:bg-slate-700">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => handleReaction(msg.id, emoji)} className="hover:scale-125" aria-label={`React with ${emoji}`}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reactions display */}
                  {msgWithReactions.message_reactions?.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {Object.entries(
                        msgWithReactions.message_reactions.reduce<Record<string, number>>((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                          return acc;
                        }, {}),
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="rounded-full border border-slate-200 px-1.5 py-0.5 text-xs dark:border-slate-600"
                          aria-label={`${emoji} reaction, ${count}`}
                        >
                          {emoji} {count}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`mt-0.5 text-[10px] text-slate-400 ${isMine ? 'text-right' : ''}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          <span className="flex-1 truncate text-xs text-slate-500">
            Replying to: {replyTo.content?.slice(0, 50)}
          </span>
          <button type="button" onClick={() => setReplyTo(null)} className="text-xs text-slate-400" aria-label="Cancel reply">&times;</button>
        </div>
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="px-4 py-1 text-xs text-slate-400">Someone is typing...</div>
      )}

      {/* Compose area */}
      <form onSubmit={handleSend} className="border-t border-slate-200 p-4 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => { setContent(e.target.value); handleTyping(); }}
            placeholder="Type a message..."
            className="input flex-1"
            aria-label="Message input"
          />
          <button type="submit" disabled={!content.trim() || sendMessage.isPending} className="btn btn-primary text-sm">
            {sendMessage.isPending ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
