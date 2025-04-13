import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isEmoji } from '@/lib/emoji';

export async function GET() {
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
        // Get all reactions by this member, then filter to emojis only
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

    return NextResponse.json({ members: membersWithStats });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
