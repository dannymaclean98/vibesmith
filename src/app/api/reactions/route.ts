import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      console.log('[Reactions] Unauthorized - no user session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // User must have a linked member to react
    if (!user.memberId) {
      console.log('[Reactions] User has no linked member:', user.id, user.phone);
      return NextResponse.json(
        { error: 'You must claim a profile to react to tracks. Try logging out and back in.' },
        { status: 400 }
      );
    }

    const { trackId, emoji } = await request.json();

    if (!trackId || !emoji) {
      console.log('[Reactions] Missing trackId or emoji');
      return NextResponse.json(
        { error: 'Track ID and emoji are required' },
        { status: 400 }
      );
    }

    // Check if track exists
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      console.log('[Reactions] Track not found:', trackId);
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    console.log('[Reactions] Creating reaction:', { trackId, memberId: user.memberId, emoji });

    // Create reaction (upsert to handle duplicates)
    const reaction = await prisma.reaction.upsert({
      where: {
        trackId_memberId_emoji: {
          trackId,
          memberId: user.memberId,
          emoji,
        },
      },
      update: {
        reactedAt: new Date(),
      },
      create: {
        trackId,
        memberId: user.memberId,
        emoji,
        reactedAt: new Date(),
      },
      include: {
        member: true,
      },
    });

    console.log('[Reactions] Reaction created successfully:', reaction.id);

    return NextResponse.json({
      success: true,
      reaction,
    });
  } catch (error) {
    console.error('[Reactions] Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.memberId) {
      return NextResponse.json(
        { error: 'You must claim a profile to remove reactions' },
        { status: 400 }
      );
    }

    const { trackId, emoji } = await request.json();

    if (!trackId || !emoji) {
      return NextResponse.json(
        { error: 'Track ID and emoji are required' },
        { status: 400 }
      );
    }

    // Delete the reaction
    await prisma.reaction.deleteMany({
      where: {
        trackId,
        memberId: user.memberId,
        emoji,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}

