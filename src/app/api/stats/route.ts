import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [memberCount, trackCount, reactionCount] = await Promise.all([
      prisma.member.count(),
      prisma.track.count(),
      prisma.reaction.count(),
    ]);

    return NextResponse.json({
      members: memberCount,
      tracks: trackCount,
      reactions: reactionCount,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

