import { prisma } from '@/lib/prisma';
import { isEmoji } from '@/lib/emoji';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TrackList } from '@/components/TrackList';

// Force dynamic rendering to prevent caching issues in production
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getMember(id: string) {
  try {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sentTracks: true,
            reactions: true,
          },
        },
      },
    });
    return member;
  } catch {
    return null;
  }
}

async function getMemberTracks(memberId: string) {
  try {
    const tracks = await prisma.track.findMany({
      where: { senderId: memberId },
      include: {
        sender: true,
        reactions: {
          include: {
            member: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });
    return tracks;
  } catch {
    return [];
  }
}

async function getTracksReactedTo(memberId: string) {
  try {
    // Find all tracks this member has reacted to (excluding their own tracks)
    const tracks = await prisma.track.findMany({
      where: {
        reactions: {
          some: {
            memberId: memberId,
          },
        },
        NOT: {
          senderId: memberId,
        },
      },
      include: {
        sender: true,
        reactions: {
          include: {
            member: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });
    return tracks;
  } catch {
    return [];
  }
}

async function getTopEmoji(memberId: string) {
  try {
    // Get all reactions by this member
    const reactions = await prisma.reaction.findMany({
      where: { memberId },
      select: { emoji: true },
    });

    // Count emojis only (exclude stickers)
    const emojiCounts = new Map<string, number>();
    for (const reaction of reactions) {
      if (isEmoji(reaction.emoji)) {
        emojiCounts.set(
          reaction.emoji,
          (emojiCounts.get(reaction.emoji) || 0) + 1
        );
      }
    }

    // Find the top emoji
    let topEmoji = '🎵';
    let maxCount = 0;
    for (const [emoji, count] of emojiCounts) {
      if (count > maxCount) {
        maxCount = count;
        topEmoji = emoji;
      }
    }

    return topEmoji;
  } catch {
    return '🎵';
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default async function MemberPage({ params }: PageProps) {
  const { id } = await params;
  const [member, tracks, reactedTracks, topEmoji] = await Promise.all([
    getMember(id),
    getMemberTracks(id),
    getTracksReactedTo(id),
    getTopEmoji(id),
  ]);

  if (!member) {
    notFound();
  }

  return (
    <main className="max-w-4xl mx-auto py-8 px-4">
      {/* Back Link */}
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
      >
        <span>←</span>
        <span>Back to Members</span>
      </Link>

      {/* Member Header */}
      <div className="flex items-center gap-6 mb-10">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="w-24 h-24 rounded-full object-cover shadow-2xl"
          />
        ) : (
          <div
            className={`w-24 h-24 rounded-full bg-gradient-to-br ${member.color || 'from-zinc-500 to-zinc-600'} flex items-center justify-center shadow-2xl`}
          >
            <span className="text-3xl font-bold text-white">
              {getInitials(member.name)}
            </span>
          </div>
        )}
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">
            {member.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>{member._count.sentTracks} tracks shared</span>
            <span>•</span>
            <span>{member._count.reactions} reactions given</span>
            <span>•</span>
            <span>Top emoji: {topEmoji}</span>
          </div>
        </div>
      </div>

      {/* Tracks Shared Section */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🎤</span>
          <span>Tracks Shared</span>
          <span className="text-sm font-normal text-zinc-500">
            ({tracks.length})
          </span>
        </h2>

        {tracks.length > 0 ? (
          <TrackList tracks={tracks} />
        ) : (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <p className="text-zinc-500">No tracks shared yet</p>
          </div>
        )}
      </section>

      {/* Tracks Reacted To Section */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>{topEmoji}</span>
          <span>Tracks Reacted To</span>
          <span className="text-sm font-normal text-zinc-500">
            ({reactedTracks.length})
          </span>
        </h2>

        {reactedTracks.length > 0 ? (
          <TrackList tracks={reactedTracks} />
        ) : (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <p className="text-zinc-500">No reactions yet</p>
          </div>
        )}
      </section>
    </main>
  );
}
