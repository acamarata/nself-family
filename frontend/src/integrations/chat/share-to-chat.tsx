'use client';

import { useState } from 'react';
import { useConversations, useSendMessage } from './use-chat';
import { useAuthStore } from '@/lib/auth-store';
import type { Conversation, ConversationMember } from '@/types';

interface ShareToChatProps {
  contentType: string;
  contentId: string;
  title: string;
  preview?: string;
  onClose: () => void;
}

type ConversationWithMembers = Conversation & {
  conversation_members: ConversationMember[];
};

/**
 * Share-to-chat modal for sharing posts, events, recipes, etc. into conversations.
 * @param contentType - Type of content being shared (post, event, recipe, album, trip)
 * @param contentId - ID of the content
 * @param title - Display title of the content
 * @param preview - Optional preview text
 * @param onClose - Close callback
 */
export function ShareToChat({ contentType, contentId, title, preview, onClose }: ShareToChatProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: conversations = [] } = useConversations(userId);
  const sendMessage = useSendMessage();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function handleShare() {
    if (!userId || !selectedConvId) return;
    await sendMessage.mutateAsync({
      conversation_id: selectedConvId,
      sender_id: userId,
      content: message || `Shared: ${title}`,
      message_type: 'shared_link',
      shared_content: { type: contentType, id: contentId, title, preview },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-label="Share to chat">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-bold">Share to Chat</h2>

        {/* Content preview */}
        <div className="mb-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div className="text-xs text-slate-400 capitalize">{contentType}</div>
          <div className="font-medium">{title}</div>
          {preview && <p className="mt-1 text-sm text-slate-500">{preview}</p>}
        </div>

        {/* Optional message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a message (optional)"
          className="input mb-3 w-full"
          rows={2}
        />

        {/* Conversation picker */}
        <p className="mb-1 text-xs font-medium text-slate-500">Send to:</p>
        <div className="mb-4 max-h-48 space-y-1 overflow-y-auto">
          {(conversations as ConversationWithMembers[]).map((conv) => {
            const displayName = conv.type === 'direct'
              ? conv.conversation_members?.find((m) => m.user_id !== userId)?.user?.display_name ?? 'User'
              : conv.title ?? 'Group';

            return (
              <label
                key={conv.id}
                className={`flex cursor-pointer items-center gap-2 rounded p-2 ${selectedConvId === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <input
                  type="radio"
                  name="conversation"
                  checked={selectedConvId === conv.id}
                  onChange={() => setSelectedConvId(conv.id)}
                />
                <span className="text-sm">{displayName}</span>
                <span className="text-xs text-slate-400">({conv.type})</span>
              </label>
            );
          })}
          {conversations.length === 0 && (
            <p className="py-2 text-sm text-slate-400">No conversations available. Start a chat first.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn text-sm">Cancel</button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!selectedConvId || sendMessage.isPending}
            className="btn btn-primary text-sm"
          >
            {sendMessage.isPending ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
