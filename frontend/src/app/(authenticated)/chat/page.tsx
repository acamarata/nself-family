'use client';

import { useState } from 'react';
import { useConversations, useCreateConversation } from '@/integrations/chat';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';
import { useFamilyMembers } from '@/hooks/use-family';
import type { Conversation, ConversationMember, Message } from '@/types';
import Link from 'next/link';

type ConversationWithPreview = Conversation & {
  conversation_members: ConversationMember[];
  messages: Message[];
};

/**
 * Chat conversation list page.
 */
export default function ChatPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: conversations = [], isLoading } = useConversations(userId);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all');

  const filtered = conversations.filter((c) => {
    if (filter === 'direct') return (c as ConversationWithPreview).type === 'direct';
    if (filter === 'group') return (c as ConversationWithPreview).type === 'group';
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chat</h1>
        <div className="flex gap-2">
          <Link href="/chat/search" className="btn text-sm">Search</Link>
          <button type="button" onClick={() => setShowCreate(true)} className="btn btn-primary text-sm">
            New Chat
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-1">
        {(['all', 'direct', 'group'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1 text-sm capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading conversations...</p>}

      {/* Conversation list */}
      <div className="space-y-1">
        {(filtered as ConversationWithPreview[]).map((conv) => {
          const lastMessage = conv.messages?.[0];
          const otherMembers = conv.conversation_members?.filter((m) => m.user_id !== userId) ?? [];
          const displayName = conv.type === 'direct'
            ? otherMembers[0]?.user?.display_name ?? 'User'
            : conv.title ?? 'Group';

          return (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                {conv.type === 'group' ? 'G' : displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{displayName}</span>
                  {lastMessage && (
                    <span className="text-xs text-slate-400">
                      {new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-slate-500">
                  {lastMessage?.deleted_at ? 'Message deleted' : lastMessage?.content ?? 'No messages yet'}
                </p>
                {conv.type === 'group' && (
                  <span className="text-xs text-slate-400">{conv.conversation_members?.length ?? 0} members</span>
                )}
              </div>
            </Link>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            {filter === 'all' ? 'No conversations yet. Start a new chat!' : `No ${filter} conversations.`}
          </p>
        )}
      </div>

      {showCreate && <CreateConversationModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateConversationModal({ onClose }: { onClose: () => void }) {
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);
  const { data: members = [] } = useFamilyMembers();
  const createConversation = useCreateConversation();
  const [type, setType] = useState<'direct' | 'group'>('direct');
  const [title, setTitle] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const availableMembers = members.filter((m) => m.user_id !== userId);

  function toggleMember(memberId: string) {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !userId || selectedMembers.length === 0) return;

    const memberData = [
      { user_id: userId, role: 'admin' },
      ...selectedMembers.map((id) => ({ user_id: id, role: 'member' })),
    ];

    await createConversation.mutateAsync({
      family_id: familyId,
      type,
      title: type === 'group' ? title || undefined : undefined,
      created_by: userId,
      conversation_members: { data: memberData },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-label="New conversation">
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-bold">New Conversation</h2>

        <div className="mb-3 flex gap-2">
          {(['direct', 'group'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setSelectedMembers([]); }}
              className={`rounded px-3 py-1 text-sm capitalize ${type === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {type === 'group' && (
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Group name" className="input mb-3 w-full" />
        )}

        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-slate-500">Select members:</p>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {availableMembers.map((member) => (
              <label key={member.user_id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-700">
                <input
                  type={type === 'direct' ? 'radio' : 'checkbox'}
                  name="member"
                  checked={selectedMembers.includes(member.user_id)}
                  onChange={() => {
                    if (type === 'direct') setSelectedMembers([member.user_id]);
                    else toggleMember(member.user_id);
                  }}
                />
                <span className="text-sm">{member.user?.display_name ?? member.display_name ?? 'User'}</span>
                <span className="text-xs text-slate-400">({member.role})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn text-sm">Cancel</button>
          <button type="submit" disabled={createConversation.isPending || selectedMembers.length === 0} className="btn btn-primary text-sm">
            {createConversation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
