import { prisma } from '@/lib/prisma';
import { PlaylistHeader } from '@/components/PlaylistHeader';
import { TrackBrowser } from '@/components/TrackBrowser';

// Force dynamic rendering to prevent caching issues in production
export const dynamic = 'force-dynamic';

const TRACKS_PER_PAGE = 50;

async function getInitialTracks() {
  try {
    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        include: {
          sender: true,
          reactions: {
            include: {
              member: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        take: TRACKS_PER_PAGE,
      }),
      prisma.track.count(),
    ]);

    return {
      tracks,
      pagination: {
        page: 1,
        limit: TRACKS_PER_PAGE,
        total,
        totalPages: Math.ceil(total / TRACKS_PER_PAGE),
        hasMore: TRACKS_PER_PAGE < total,
      },
    };
  } catch (error) {
    console.error('Failed to fetch tracks:', error);
    return {
      tracks: [],
      pagination: {
        page: 1,
        limit: TRACKS_PER_PAGE,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
  }
}

async function getStats() {
  try {
    const [memberCount, trackCount] = await Promise.all([
      prisma.member.count(),
      prisma.track.count(),
    ]);
    return { members: memberCount, tracks: trackCount };
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return { members: 0, tracks: 0 };
  }
}

export default async function Home() {
  const [{ tracks, pagination }, stats] = await Promise.all([
    getInitialTracks(),
    getStats(),
  ]);

  return (
    <main className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
      <PlaylistHeader memberCount={stats.members} trackCount={stats.tracks} />
      <TrackBrowser initialTracks={tracks} initialPagination={pagination} />
    </main>
  );
}
