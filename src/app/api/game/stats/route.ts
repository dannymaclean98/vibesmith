import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get total rounds played
    const totalRounds = await prisma.gameRound.count({
      where: { userId: user.id },
    });

    // Get correct guesses
    const correctGuesses = await prisma.gameRound.count({
      where: { userId: user.id, isCorrect: true },
    });

    // Get total tracks
    const totalTracks = await prisma.track.count();

    // Calculate streak
    const recentRounds = await prisma.gameRound.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { isCorrect: true },
    });

    let currentStreak = 0;
    for (const round of recentRounds) {
      if (round.isCorrect) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate best streak ever
    let bestStreak = 0;
    let tempStreak = 0;
    for (const round of [...recentRounds].reverse()) {
      if (round.isCorrect) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate accuracy
    const accuracy = totalRounds > 0 
      ? Math.round((correctGuesses / totalRounds) * 100) 
      : 0;

    return NextResponse.json({
      totalRounds,
      correctGuesses,
      totalTracks,
      remaining: totalTracks - totalRounds,
      currentStreak,
      bestStreak,
      accuracy,
    });
  } catch (error) {
    console.error('[Game Stats] Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game stats' },
      { status: 500 }
    );
  }
}

