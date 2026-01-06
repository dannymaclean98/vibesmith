import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { trackId, guessedMemberId } = await request.json();

    if (!trackId || !guessedMemberId) {
      return NextResponse.json(
        { error: 'Track ID and guessed member ID are required' },
        { status: 400 }
      );
    }

    // Get the track to check the correct answer
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        sender: {
          include: {
            user: {
              select: {
                avatarUrl: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    // Check if user already guessed this track
    const existingGuess = await prisma.gameRound.findFirst({
      where: {
        userId: user.id,
        trackId,
      },
    });

    if (existingGuess) {
      return NextResponse.json(
        { error: 'You have already guessed this track' },
        { status: 400 }
      );
    }

    // Determine if guess is correct
    const isCorrect = track.senderId === guessedMemberId;

    // Save the game round
    await prisma.gameRound.create({
      data: {
        userId: user.id,
        trackId,
        guessedMemberId,
        isCorrect,
      },
    });

    // Get updated stats
    const stats = await prisma.gameRound.aggregate({
      where: { userId: user.id },
      _count: { id: true },
    });

    const correctCount = await prisma.gameRound.count({
      where: { userId: user.id, isCorrect: true },
    });

    // Calculate streak
    const recentRounds = await prisma.gameRound.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { isCorrect: true },
    });

    let streak = 0;
    for (const round of recentRounds) {
      if (round.isCorrect) {
        streak++;
      } else {
        break;
      }
    }

    return NextResponse.json({
      isCorrect,
      correctMember: {
        id: track.sender.id,
        name: track.sender.user?.displayName || track.sender.name,
        avatarUrl: track.sender.user?.avatarUrl || track.sender.avatarUrl,
        color: track.sender.color,
      },
      score: {
        correct: correctCount,
        total: stats._count.id,
        streak,
      },
    });
  } catch (error) {
    console.error('[Game Guess] Error submitting guess:', error);
    return NextResponse.json(
      { error: 'Failed to submit guess' },
      { status: 500 }
    );
  }
}

