'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGraphQL } from '@/hooks/use-graphql';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';

const SEARCH_MESSAGES_QUERY = `
  query SearchMessages($userId: uuid!, $query: String!, $conversationId: uuid) {
    messages(
      where: {
        content: { _ilike: $query },
        deleted_at: { _is_null: true },
        conversation: { conversation_members: { user_id: { _eq: $userId } } },
        conversation_id: { _eq: $conversationId }
      },
      order_by: { created_at: desc },
      limit: 50
    ) {
      id conversation_id content sender_id created_at
      sender { id display_name avatar_url }
      conversation { id title type }
    }
  }
`;

/**
 * Chat search page — search messages across conversations.
 */
export default function ChatSearchPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const { execute } = useGraphQL();
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['chatSearch', userId, searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const data = await execute<{
        messages: Array<{
          id: string;
          conversation_id: string;
          content: string;
          sender_id: string;
          created_at: string;
          sender: { id: string; display_name: string | null };
          conversation: { id: string; title: string | null; type: string };
        }>;
      }>(SEARCH_MESSAGES_QUERY, {
        userId,
        query: `%${searchTerm}%`,
        conversationId: null,
      });
      return data.messages;
    },
    enabled: !!userId && searchTerm.length > 0,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(query);
  }

  return (
    <div className="mx-auto max-w-3xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/chat" className="text-sm text-blue-600 hover:text-blue-700">&larr; Back</Link>
        <h1 className="text-2xl font-bold">Search Messages</h1>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="input flex-1"
          aria-label="Search query"
        />
        <button type="submit" className="btn btn-primary text-sm" disabled={!query.trim()}>
          Search
        </button>
      </form>

      {isLoading && <p className="text-sm text-slate-500">Searching...</p>}

      <div className="space-y-2">
        {results.map((msg) => (
          <Link
            key={msg.id}
            href={`/chat/${msg.conversation_id}`}
            className="block rounded-lg border border-slate-200 p-3 transition-colors hover:border-blue-300 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {msg.conversation.title ?? (msg.conversation.type === 'direct' ? 'Direct message' : 'Group')}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(msg.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-1 text-sm">
              <span className="font-medium">{msg.sender?.display_name ?? 'User'}: </span>
              {highlightMatch(msg.content, searchTerm)}
            </p>
          </Link>
        ))}
        {!isLoading && searchTerm && results.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500">No messages found matching "{searchTerm}".</p>
        )}
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700">{part}</mark> : part,
  );
}
