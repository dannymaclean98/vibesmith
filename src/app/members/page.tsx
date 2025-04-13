import { prisma } from '@/lib/prisma';
import { isEmoji } from '@/lib/emoji';
import Link from 'next/link';

// Force dynamic rendering to prevent caching issues in production
export const dynamic = 'force-dynamic';

async function getMembers() {
  try {
    const members = await prisma.member.findMany({
      include: {
        _count: {
          select: {
            sentTracks: true,
            reactions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get top emoji for each member (excluding stickers)
    const membersWithStats = await Promise.all(
      members.map(async (member) => {
        // Get all reactions by this member
        const reactions = await prisma.reaction.findMany({
          where: { memberId: member.id },
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

        return {
          ...member,
          tracksShared: member._count.sentTracks,
          reactionsGiven: member._count.reactions,
          topEmoji,
        };
      })
    );

    return membersWithStats;
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return [];
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

export default async function MembersPage() {
  const members = await getMembers();

  return (
    <main className="max-w-4xl mx-auto py-6 sm:py-8 px-4">
      {/* Header Section */}
      <div className="mb-6 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">The Crew</h1>
        <p className="text-zinc-400 text-sm sm:text-base">
          Everyone who&apos;s shared vibes in the group chat
        </p>
      </div>

      {/* Members Grid */}
      {members.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-white/10 transition-all active:scale-[0.98] sm:hover:scale-[1.02] cursor-pointer group block"
            >
              {/* Avatar */}
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-lg"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br ${member.color || 'from-zinc-500 to-zinc-600'} flex items-center justify-center shadow-lg`}
                  >
                    <span className="text-lg sm:text-xl font-bold text-white">
                      {getInitials(member.name)}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                    {member.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500">Member</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-black/20 rounded-lg py-2 sm:py-3">
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {member.tracksShared}
                  </p>
                  <p className="text-[10px] sm:text-xs text-zinc-500">Tracks</p>
                </div>
                <div className="bg-black/20 rounded-lg py-2 sm:py-3">
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {member.reactionsGiven}
                  </p>
                  <p className="text-[10px] sm:text-xs text-zinc-500">Reactions</p>
                </div>
                <div className="bg-black/20 rounded-lg py-2 sm:py-3">
                  <p className="text-xl sm:text-2xl">{member.topEmoji}</p>
                  <p className="text-[10px] sm:text-xs text-zinc-500">Top</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-lg mb-4">No members yet!</p>
          <p className="text-zinc-600 text-sm">
            Run{' '}
            <code className="bg-zinc-800 px-2 py-1 rounded">
              npx tsx scripts/import-data.ts
            </code>{' '}
            to import your data.
          </p>
        </div>
      )}
    </main>
  );
}
