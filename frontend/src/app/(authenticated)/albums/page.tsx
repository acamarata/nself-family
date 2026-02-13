'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQLClient } from '@/hooks/use-graphql';
import { useFamilyStore } from '@/lib/family-store';
import type { VisibilityLevel } from '@/types';

const ALBUMS_QUERY = `
  query FamilyAlbums($family_id: uuid!) {
    albums(
      where: { family_id: { _eq: $family_id }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
    ) {
      id title description visibility created_at
      album_items_aggregate { aggregate { count } }
    }
  }
`;

const CREATE_ALBUM_MUTATION = `
  mutation CreateAlbum($object: albums_insert_input!) {
    insert_albums_one(object: $object) { id title }
  }
`;

export default function AlbumsPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const client = useGraphQLClient();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<VisibilityLevel>('family');

  const { data, isLoading } = useQuery({
    queryKey: ['albums', activeFamilyId],
    queryFn: async () => {
      const res = await client.request<{ albums: any[] }>(ALBUMS_QUERY, { family_id: activeFamilyId });
      return res.albums;
    },
    enabled: !!activeFamilyId,
  });

  const createAlbum = useMutation({
    mutationFn: async () => {
      return client.request(CREATE_ALBUM_MUTATION, {
        object: { family_id: activeFamilyId, title, description: description || null, visibility },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      setShowCreate(false);
      setTitle('');
      setDescription('');
    },
  });

  if (!activeFamilyId) {
    return <div className="py-20 text-center text-slate-500">Select a family first.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Albums</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
          New Album
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); createAlbum.mutate(); }}
          className="card mb-4 space-y-3"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Album title"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            placeholder="Description (optional)"
            rows={2}
          />
          <div className="flex justify-between">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as VisibilityLevel)}
              className="input w-auto"
              aria-label="Album visibility"
            >
              <option value="family">Family</option>
              <option value="adults_only">Adults only</option>
              <option value="private">Private</option>
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={createAlbum.isPending} className="btn-primary">
                {createAlbum.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : !data || data.length === 0 ? (
        <div className="py-10 text-center text-slate-400">No albums yet. Create one to get started!</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {data.map((album: any) => (
            <Link
              key={album.id}
              href={`/albums/${album.id}`}
              className="card transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex h-24 items-center justify-center rounded-lg bg-slate-100 text-4xl text-slate-300 dark:bg-slate-700">
                📸
              </div>
              <h3 className="text-sm font-semibold">{album.title}</h3>
              <p className="text-xs text-slate-400">
                {album.album_items_aggregate?.aggregate?.count ?? 0} items
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
