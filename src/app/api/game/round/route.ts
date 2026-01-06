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

    // Get all track IDs the user has already guessed
    const guessedRounds = await prisma.gameRound.findMany({
      where: { userId: user.id },
      select: { trackId: true },
    });
    const guessedTrackIds = guessedRounds.map(r => r.trackId);

    // Get total track count for progress
    const totalTracks = await prisma.track.count();

    // Find a random track the user hasn't guessed yet
    const availableTracks = await prisma.track.findMany({
      where: {
        id: { notIn: guessedTrackIds },
      },
      include: {
        sender: true,
      },
    });

    if (availableTracks.length === 0) {
      // User has guessed all tracks
      return NextResponse.json({
        complete: true,
        totalGuessed: guessedTrackIds.length,
        totalTracks,
      });
    }

    // Pick a random track
    const randomIndex = Math.floor(Math.random() * availableTracks.length);
    const track = availableTracks[randomIndex];

    // Get all members (shuffled) as options
    const members = await prisma.member.findMany({
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        color: true,
        user: {
          select: {
            avatarUrl: true,
            displayName: true,
          },
        },
      },
    });

    // Shuffle members
    const shuffledMembers = members
      .map(m => ({
        id: m.id,
        name: m.user?.displayName || m.name,
        avatarUrl: m.user?.avatarUrl || m.avatarUrl,
        color: m.color,
      }))
      .sort(() => Math.random() - 0.5);

    return NextResponse.json({
      complete: false,
      track: {
        id: track.id,
        name: track.trackName,
        artist: track.artistName,
        album: track.albumName,
        albumArt: track.albumImageUrl,
        spotifyUrl: track.spotifyUrl,
      },
      members: shuffledMembers,
      progress: {
        guessed: guessedTrackIds.length,
        total: totalTracks,
        remaining: availableTracks.length,
      },
    });
  } catch (error) {
    console.error('[Game Round] Error fetching round:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game round' },
      { status: 500 }
    );
  }
}

