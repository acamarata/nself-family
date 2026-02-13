'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useGraphQLClient } from '@/hooks/use-graphql';

const ALBUM_QUERY = `
  query GetAlbum($id: uuid!) {
    albums_by_pk(id: $id) {
      id title description visibility created_at
      album_items(order_by: { sort_order: asc }) {
        id sort_order caption
        media_item {
          id file_name mime_type storage_path width height processing_status
        }
      }
    }
  }
`;

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const client = useGraphQLClient();

  const { data, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      const res = await client.request<{ albums_by_pk: any }>(ALBUM_QUERY, { id: albumId });
      return res.albums_by_pk;
    },
    enabled: !!albumId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  if (!data) {
    return <div className="py-20 text-center text-slate-500">Album not found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pl-56">
      <h1 className="mb-2 text-2xl font-bold">{data.title}</h1>
      {data.description && <p className="mb-4 text-slate-500">{data.description}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {data.album_items?.map((item: any) => (
          <div key={item.id} className="group relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
            {item.media_item?.mime_type?.startsWith('image/') && item.media_item.processing_status === 'completed' ? (
              <img
                src={item.media_item.storage_path}
                alt={item.caption ?? item.media_item.file_name}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                {item.media_item?.processing_status === 'completed'
                  ? item.media_item?.file_name
                  : 'Processing...'}
              </div>
            )}
            {item.caption && (
              <p className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {item.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
